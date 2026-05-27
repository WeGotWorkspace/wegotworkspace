import { wgwFetch, wgwFetchPrincipal, wgwReadJson } from "@/lib/api/wgw/http";
import { fetchWgwPlugins } from "@/lib/api/wgw/plugins";
import type {
  WgwDriveChangeDirRequest,
  WgwDriveCreateRequest,
  WgwDriveDeleteItemsRequest,
  WgwDriveDirectoryEntry,
  WgwDriveListingResponse,
  WgwDriveRenameRequest,
  WgwDriveStarUpdateRequest,
  WgwDriveStarsResponse,
  WgwDriveUserResponse,
  WgwPluginDescriptor,
} from "@/lib/api/wgw/types";
import type {
  DriveAPIOperations,
  DriveAppBootstrap,
  DriveUploadProgress,
  DriveUIData,
} from "@/drive-core/src/drive-types";

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withLeading === "/") return "/";
  return withLeading.replace(/\/+$/, "");
}

function downloadPathToken(path: string): string {
  const bytes = new TextEncoder().encode(path);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function uploadIdentifier(file: File): string {
  const raw = `${file.name}-${file.size}-${file.lastModified}`;
  return raw.replace(/[^0-9A-Za-z_]/g, "_");
}

function isVisibleDriveEntry(entry: WgwDriveDirectoryEntry): boolean {
  return !entry.name.trim().startsWith(".");
}

const DRIVE_UPLOAD_CHUNK_SIZE = 1 * 1024 * 1024; // Stay below stricter upload_max_filesize defaults.

async function fetchDriveUser(opts?: { signal?: AbortSignal }) {
  const res = await wgwFetch("/drive/user", { signal: opts?.signal });
  if (!res.ok) throw new Error(`GET /drive/user failed (${res.status})`);
  const payload = (await wgwReadJson(res)) as WgwDriveUserResponse;
  return payload.data;
}

async function fetchListing(dir: string, opts?: { signal?: AbortSignal }) {
  const res = await wgwFetch("/drive/getdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir: normalizePath(dir) }),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`POST /drive/getdir failed (${res.status})`);
  const payload = (await wgwReadJson(res)) as WgwDriveListingResponse;
  return {
    ...payload.data,
    files: payload.data.files.filter(isVisibleDriveEntry),
  };
}

async function fetchState(
  dir: string,
  opts?: { signal?: AbortSignal },
  plugins: WgwPluginDescriptor[] = [],
): Promise<DriveUIData> {
  const user = await fetchDriveUser(opts);
  const userRoot = normalizePath(`/users/${user.username}`);
  const requested = normalizePath(dir);
  const targetDir = requested === "/" || requested === "/users" ? userRoot : requested;
  const directory = await fetchListing(targetDir, opts);

  // Expose member groups under My Drive root by merging /groups folders there.
  if (normalizePath(directory.location) === userRoot) {
    try {
      const groupsDir = await fetchListing("/groups", opts);
      const existing = new Set(directory.files.map((entry) => normalizePath(entry.path)));
      const groupFolders = groupsDir.files.filter(
        (entry) => entry.type === "dir" && !existing.has(normalizePath(entry.path)),
      );
      return {
        user,
        cwd: directory.location,
        directory: { ...directory, files: [...directory.files, ...groupFolders] },
        plugins,
      };
    } catch {
      // Group merge is additive only; keep user root listing if /groups fetch fails.
    }
  }

  return { user, cwd: directory.location, directory, plugins };
}

export async function fetchDriveLiveBootstrap(): Promise<DriveAppBootstrap> {
  const [session, driveState, plugins] = await Promise.all([
    wgwFetchPrincipal(),
    fetchState("/"),
    fetchWgwPlugins().catch(() => []),
  ]);
  return {
    session,
    data: {
      ...driveState,
      plugins,
    },
  };
}

async function postJson(path: string, body: object, opts?: { signal?: AbortSignal }) {
  const res = await wgwFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
}

export function createWgwDriveOperations(
  initialCwd = "/",
  initialPlugins: WgwPluginDescriptor[] = [],
): DriveAPIOperations {
  let cwd = normalizePath(initialCwd);
  const plugins: WgwPluginDescriptor[] = initialPlugins;

  return {
    async refreshState(opts) {
      const state = await fetchState(cwd, opts, plugins);
      cwd = state.cwd;
      return state;
    },
    async changeDir(to, opts) {
      const payload: WgwDriveChangeDirRequest = { to: normalizePath(to) };
      const res = await wgwFetch("/drive/changedir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: opts?.signal,
      });
      if (!res.ok) throw new Error(`POST /drive/changedir failed (${res.status})`);
      const changed = (await wgwReadJson(res)) as { data: { cwd: string } };
      cwd = normalizePath(changed.data.cwd);
      return fetchState(cwd, opts, plugins);
    },
    async listDirectory(at, opts) {
      return fetchState(normalizePath(at), opts, plugins);
    },
    async search(query, opts) {
      const res = await wgwFetch("/drive/searchfiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query.trim(), limit: opts?.limit ?? 200 }),
        signal: opts?.signal,
      });
      if (!res.ok) throw new Error(`POST /drive/searchfiles failed (${res.status})`);
      const payload = (await wgwReadJson(res)) as WgwDriveListingResponse;
      return payload.data.files.filter(isVisibleDriveEntry);
    },
    async createFolder(input, opts) {
      const payload: WgwDriveCreateRequest = {
        cwd: normalizePath(input.cwd),
        name: input.name.trim(),
        type: "dir",
      };
      await postJson("/drive/createnew", payload, opts);
      return fetchState(cwd, opts, plugins);
    },
    async createFile(input, opts) {
      const payload: WgwDriveCreateRequest = {
        cwd: normalizePath(input.cwd),
        name: input.name.trim(),
        type: "file",
      };
      await postJson("/drive/createnew", payload, opts);
      return fetchState(cwd, opts, plugins);
    },
    async renameItem(input, opts) {
      const payload: WgwDriveRenameRequest = {
        destination: normalizePath(input.destination),
        from: input.from,
        to: input.to,
      };
      await postJson("/drive/renameitem", payload, opts);
      return fetchState(cwd, opts, plugins);
    },
    async deleteItems(paths, opts) {
      const payload: WgwDriveDeleteItemsRequest = {
        items: paths.map((path) => ({ path: normalizePath(path) })),
      };
      await postJson("/drive/deleteitems", payload, opts);
      return fetchState(cwd, opts, plugins);
    },
    async downloadFile(path, opts) {
      const encoded = encodeURIComponent(downloadPathToken(normalizePath(path)));
      const res = await wgwFetch(`/drive/download?path=${encoded}`, { signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /drive/download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = path.split("/").pop() || "download";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    async readFileBlob(path, opts) {
      const encoded = encodeURIComponent(downloadPathToken(normalizePath(path)));
      const res = await wgwFetch(`/drive/download?path=${encoded}`, { signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /drive/download failed (${res.status})`);
      return res.blob();
    },
    async checkUploadReady(opts) {
      const res = await wgwFetch("/drive/upload", { method: "GET", signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /drive/upload failed (${res.status})`);
    },
    async listStars(opts) {
      const res = await wgwFetch("/drive/stars", { method: "GET", signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /drive/stars failed (${res.status})`);
      const payload = (await wgwReadJson(res)) as WgwDriveStarsResponse;
      return payload.data.paths ?? [];
    },
    async listEntriesByPaths(paths, opts) {
      const normalized = Array.from(
        new Set(
          paths
            .map((path) => normalizePath(path))
            .filter((path) => path !== "/" && path.length > 1),
        ),
      );
      if (normalized.length === 0) return [];

      const parentDirs = Array.from(
        new Set(normalized.map((path) => parentAndName(path).destination)),
      );
      const entriesByPath = new Map<string, WgwDriveDirectoryEntry>();

      await Promise.all(
        parentDirs.map(async (dir) => {
          try {
            const listing = await fetchListing(dir, opts);
            for (const entry of listing.files) {
              entriesByPath.set(normalizePath(entry.path), entry);
            }
          } catch {
            // Skip directories we cannot read; keep partial starred results.
          }
        }),
      );

      return normalized
        .map((path) => entriesByPath.get(path))
        .filter((entry): entry is WgwDriveDirectoryEntry => !!entry);
    },
    async setStar(input, opts) {
      const payload: WgwDriveStarUpdateRequest = {
        path: normalizePath(input.path),
        starred: !!input.starred,
      };
      await postJson("/drive/stars", payload, opts);
    },
    async uploadFiles(input, opts) {
      const targetCwd = normalizePath(input.cwd);
      const totalBytes = input.files.reduce((sum, file) => sum + file.size, 0);
      const allChunks = input.files.reduce(
        (sum, file) => sum + Math.max(1, Math.ceil(file.size / DRIVE_UPLOAD_CHUNK_SIZE)),
        0,
      );
      let uploadedBytes = 0;
      let uploadedChunks = 0;
      let filesCompleted = 0;
      const filesTotal = input.files.length;
      const publishProgress = (currentFileName: string) => {
        if (!opts?.onProgress) return;
        const progress: DriveUploadProgress = {
          uploadedBytes,
          totalBytes,
          uploadedChunks,
          totalChunks: allChunks,
          currentFileName,
          filesCompleted,
          filesTotal,
        };
        opts.onProgress(progress);
      };
      publishProgress(input.files[0]?.name ?? "");
      for (const file of input.files) {
        const fileChunks = Math.max(1, Math.ceil(file.size / DRIVE_UPLOAD_CHUNK_SIZE));
        const identifier = uploadIdentifier(file);
        for (let chunkIndex = 0; chunkIndex < fileChunks; chunkIndex += 1) {
          const start = chunkIndex * DRIVE_UPLOAD_CHUNK_SIZE;
          const end = Math.min(file.size, start + DRIVE_UPLOAD_CHUNK_SIZE);
          const chunkBlob = file.slice(start, end);

          const form = new FormData();
          form.append("file", chunkBlob, file.name);
          form.append("resumableFilename", file.name);
          form.append("resumableIdentifier", identifier);
          form.append("resumableChunkNumber", String(chunkIndex + 1));
          form.append("resumableTotalChunks", String(fileChunks));
          form.append("cwd", targetCwd);

          const res = await wgwFetch("/drive/upload", {
            method: "POST",
            body: form,
            signal: opts?.signal,
          });
          if (!res.ok) throw new Error(`POST /drive/upload failed (${res.status})`);
          uploadedChunks += 1;
          uploadedBytes += chunkBlob.size;
          publishProgress(file.name);
        }
        filesCompleted += 1;
        publishProgress(file.name);
      }
      const state = await fetchState(targetCwd, opts, plugins);
      cwd = normalizePath(state.cwd);
      return state;
    },
  };
}

export function parentAndName(path: string): { destination: string; from: string } {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return { destination: "/", from: normalized.replace(/^\//, "") };
  return { destination: normalized.slice(0, idx), from: normalized.slice(idx + 1) };
}

export function pathFromDirectoryEntry(entry: WgwDriveDirectoryEntry): string {
  return normalizePath(entry.path);
}
