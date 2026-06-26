/**
 * A share-backed implementation of {@link DriveAPIOperations} so the recipient viewer can
 * reuse drive-core building blocks. Paths are relative to the share root; the confirmed-email
 * credential (when present) is supplied via {@link ShareAccessTokenProvider}.
 */
import {
  createShareDirectory,
  fetchShareChildren,
  fetchShareContentBlob,
  uploadShareContent,
  type ShareAccessTokenProvider,
} from "@/lib/api/wgw/shares";
import type { WgwDriveDirectoryEntry } from "@/lib/api/wgw/types";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";

function unsupported(operation: string): never {
  throw new Error(`${operation} is not supported for public shares.`);
}

function entryFromShareChild(child: {
  type: "file" | "dir";
  path: string;
  name: string;
  size: number;
  time: number;
}): WgwDriveDirectoryEntry {
  return {
    type: child.type,
    path: child.path,
    name: child.name,
    size: child.size,
    time: child.time,
    permissions: 0,
  };
}

async function loadShareState(
  token: string,
  relPath: string,
  getAccessToken: ShareAccessTokenProvider,
  opts?: { signal?: AbortSignal },
): Promise<DriveUIData> {
  const children = await fetchShareChildren(token, relPath, getAccessToken(), opts);
  return {
    user: { username: "", name: "", role: "user", roots: [] },
    cwd: children.location,
    directory: {
      location: children.location,
      files: children.files.map(entryFromShareChild),
    },
    plugins: [],
  };
}

export function createShareDriveOperations(
  token: string,
  getAccessToken: ShareAccessTokenProvider = () => null,
): DriveAPIOperations {
  let cwd = "";

  return {
    async refreshState(opts) {
      return loadShareState(token, cwd, getAccessToken, opts);
    },
    async changeDir(to, opts) {
      cwd = to;
      return loadShareState(token, cwd, getAccessToken, opts);
    },
    async listDirectory(at, opts) {
      return loadShareState(token, at, getAccessToken, opts);
    },
    async search() {
      return [];
    },
    createFolder: async (input, opts) => {
      await createShareDirectory(
        token,
        { name: input.name, path: input.cwd || null },
        getAccessToken(),
        opts,
      );
      return loadShareState(token, cwd, getAccessToken, opts);
    },
    createFile: () => unsupported("Creating files"),
    renameItem: () => unsupported("Renaming"),
    deleteItems: () => unsupported("Deleting"),
    async downloadFile(path, opts) {
      const blob = await fetchShareContentBlob(token, path, getAccessToken(), opts);
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
      return fetchShareContentBlob(token, path, getAccessToken(), opts);
    },
    async checkUploadReady() {
      // Public shares have no readiness probe; write permission is enforced server-side.
    },
    async listStars() {
      return [];
    },
    async listEntriesByPaths() {
      return [];
    },
    setStar: () => unsupported("Starring"),
    async uploadFiles(input, opts) {
      await uploadShareContent(
        token,
        { parentPath: input.cwd, files: input.files },
        getAccessToken(),
        {
          signal: opts?.signal,
          onProgress: (progress) =>
            opts?.onProgress?.({
              uploadedBytes: progress.uploadedBytes,
              totalBytes: progress.totalBytes,
              uploadedChunks: progress.filesCompleted,
              totalChunks: progress.filesTotal,
              currentFileName: progress.currentFileName,
              filesCompleted: progress.filesCompleted,
              filesTotal: progress.filesTotal,
            }),
        },
      );
      cwd = input.cwd;
      return loadShareState(token, cwd, getAccessToken, opts);
    },
  };
}
