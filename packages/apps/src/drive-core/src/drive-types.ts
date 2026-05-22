import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type {
  WgwDriveDirectoryData,
  WgwDriveDirectoryEntry,
  WgwDriveUserData,
} from "@/lib/api/wgw/types";

export type DriveUIData = {
  user: WgwDriveUserData;
  cwd: string;
  directory: WgwDriveDirectoryData;
};

export type DriveAppBootstrap = {
  data: DriveUIData;
  session: WorkspaceSession;
};

export type DriveUploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  uploadedChunks: number;
  totalChunks: number;
  currentFileName: string;
  filesCompleted: number;
  filesTotal: number;
};

export type DriveAPIOperations = {
  refreshState: (opts?: { signal?: AbortSignal }) => Promise<DriveUIData>;
  changeDir: (to: string, opts?: { signal?: AbortSignal }) => Promise<DriveUIData>;
  /** List a directory without updating the session working directory. */
  listDirectory: (at: string, opts?: { signal?: AbortSignal }) => Promise<DriveUIData>;
  search: (
    query: string,
    opts?: { limit?: number; signal?: AbortSignal },
  ) => Promise<WgwDriveDirectoryEntry[]>;
  createFolder: (
    input: { cwd: string; name: string },
    opts?: { signal?: AbortSignal },
  ) => Promise<DriveUIData>;
  createFile: (
    input: { cwd: string; name: string },
    opts?: { signal?: AbortSignal },
  ) => Promise<DriveUIData>;
  renameItem: (
    input: { destination: string; from: string; to: string },
    opts?: { signal?: AbortSignal },
  ) => Promise<DriveUIData>;
  deleteItems: (paths: string[], opts?: { signal?: AbortSignal }) => Promise<DriveUIData>;
  downloadFile: (path: string, opts?: { signal?: AbortSignal }) => Promise<void>;
  readFileBlob: (path: string, opts?: { signal?: AbortSignal }) => Promise<Blob>;
  checkUploadReady: (opts?: { signal?: AbortSignal }) => Promise<void>;
  listStars: (opts?: { signal?: AbortSignal }) => Promise<string[]>;
  listEntriesByPaths: (
    paths: string[],
    opts?: { signal?: AbortSignal },
  ) => Promise<WgwDriveDirectoryEntry[]>;
  setStar: (
    input: { path: string; starred: boolean },
    opts?: { signal?: AbortSignal },
  ) => Promise<void>;
  uploadFiles: (
    input: { cwd: string; files: File[] },
    opts?: {
      signal?: AbortSignal;
      onProgress?: (progress: DriveUploadProgress) => void;
    },
  ) => Promise<DriveUIData>;
};
