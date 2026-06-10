import {
  wgwFetch,
  wgwFetchPrincipal,
  wgwEnsurePluginSession,
  wgwReadJson,
} from "@/lib/api/wgw/http";
import { downloadWgwUnifiedSearchRecord } from "@/lib/api/wgw/search";
import { fetchWgwPlugins } from "@/lib/api/wgw/plugins";
import type {
  WgwDriveDirectoryEntry,
  WgwDriveListingResponse,
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

import {
  parentAndName,
  pathFromDirectoryEntry,
  normalizeApiVirtualPath as normalizePath,
} from "@/lib/files/api-path";

function pathQuery(path: string): string {
  return `path=${encodeURIComponent(normalizePath(path))}`;
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
  const res = await wgwFetch("/files/context", { signal: opts?.signal });
  if (!res.ok) throw new Error(`GET /files/context failed (${res.status})`);
  const payload = (await wgwReadJson(res)) as WgwDriveUserResponse;
  return payload.data;
}

async function fetchListing(dir: string, opts?: { signal?: AbortSignal }) {
  const res = await wgwFetch(`/files/children?${pathQuery(dir)}`, { signal: opts?.signal });
  if (!res.ok) throw new Error(`GET /files/children failed (${res.status})`);
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

async function patchJson(path: string, body: object, opts?: { signal?: AbortSignal }) {
  const res = await wgwFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status})`);
}

async function deleteJson(path: string, body: object, opts?: { signal?: AbortSignal }) {
  const res = await wgwFetch(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed (${res.status})`);
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
      cwd = normalizePath(to);
      return fetchState(cwd, opts, plugins);
    },
    async listDirectory(at, opts) {
      return fetchState(normalizePath(at), opts, plugins);
    },
    async search(query, opts) {
      const params = new URLSearchParams();
      params.set("search", query.trim());
      params.set("limit", String(Math.min(100, opts?.limit ?? 100)));
      const res = await wgwFetch(`/files?${params.toString()}`, { signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /files?search= failed (${res.status})`);
      const payload = (await wgwReadJson(res)) as WgwDriveListingResponse;
      return payload.data.files.filter(isVisibleDriveEntry);
    },
    async createFolder(input, opts) {
      const parent = normalizePath(input.cwd);
      const name = input.name.trim();
      await postJson(`/files/directories?${pathQuery(parent)}`, { name }, opts);
      return fetchState(cwd, opts, plugins);
    },
    async createFile(input, opts) {
      const parent = normalizePath(input.cwd);
      const name = input.name.trim();
      await postJson(`/files/directories?${pathQuery(parent)}`, { name, type: "file" }, opts);
      return fetchState(cwd, opts, plugins);
    },
    async renameItem(input, opts) {
      const fromPath = input.from.includes("/")
        ? normalizePath(input.from)
        : (() => {
            const parent = normalizePath(input.destination);
            return parent === "/" ? `/${input.from}` : `${parent}/${input.from}`;
          })();
      const destination = normalizePath(input.destination);
      const body: { name: string; destination?: string } = { name: input.to };
      if (destination !== parentAndName(fromPath).destination) {
        body.destination = destination;
      }
      await patchJson(`/files?${pathQuery(fromPath)}`, body, opts);
      return fetchState(cwd, opts, plugins);
    },
    async deleteItems(paths, opts) {
      const normalized = paths.map((path) => normalizePath(path));
      if (normalized.length === 1) {
        await wgwFetch(`/files?${pathQuery(normalized[0]!)}`, {
          method: "DELETE",
          signal: opts?.signal,
        }).then((res) => {
          if (!res.ok) throw new Error(`DELETE /files?path= failed (${res.status})`);
        });
      } else {
        await deleteJson("/files", { paths: normalized }, opts);
      }
      return fetchState(cwd, opts, plugins);
    },
    async downloadFile(path, opts) {
      const res = await wgwFetch(`/files/content?${pathQuery(path)}`, { signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /files/content failed (${res.status})`);
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
      const res = await wgwFetch(`/files/content?${pathQuery(path)}`, { signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /files/content failed (${res.status})`);
      return res.blob();
    },
    async checkUploadReady(opts) {
      const res = await wgwFetch("/files/content", { method: "HEAD", signal: opts?.signal });
      if (!res.ok) throw new Error(`HEAD /files/content failed (${res.status})`);
    },
    async listStars(opts) {
      const res = await wgwFetch("/files/starred", { method: "GET", signal: opts?.signal });
      if (!res.ok) throw new Error(`GET /files/starred failed (${res.status})`);
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
      const target = `/files/star?${pathQuery(input.path)}`;
      if (input.starred) {
        await postJson(target, {}, opts);
      } else {
        const res = await wgwFetch(target, { method: "DELETE", signal: opts?.signal });
        if (!res.ok) throw new Error(`DELETE /files/star failed (${res.status})`);
      }
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

          const res = await wgwFetch(`/files/content?${pathQuery(targetCwd)}`, {
            method: "POST",
            body: form,
            signal: opts?.signal,
          });
          if (!res.ok) throw new Error(`POST /files/content failed (${res.status})`);
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
    async downloadUnifiedSearchRecord(input, opts) {
      await downloadWgwUnifiedSearchRecord({ ...input, signal: opts?.signal });
    },
    async ensurePluginSession(sessionApiPath, opts) {
      await wgwEnsurePluginSession(sessionApiPath, opts);
    },
  };
}

export { parentAndName, pathFromDirectoryEntry } from "@/lib/files/api-path";
