/** Mock-tier fixtures for the public share viewer (Storybook + Vitest). */
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import type { WgwDriveDirectoryEntry } from "@/lib/api/wgw/types";
import type { WgwSharePublicMeta } from "@/lib/api/wgw/shares-types";
import type { ShareApiSource } from "@/share-core/src/share-types";
import { normalizeSharePath } from "@/share-core/src/share-file-utils";

const now = Math.floor(Date.now() / 1000);

function entry(
  type: "file" | "dir",
  path: string,
  name: string,
  size: number,
): WgwDriveDirectoryEntry {
  return { type, path, name, size, time: now - 3600, permissions: 0 };
}

const MOCK_TREE: Record<string, WgwDriveDirectoryEntry[]> = {
  "": [
    entry("dir", "photos", "photos", 0),
    entry("file", "report.pdf", "report.pdf", 248_000),
    entry("file", "logo.png", "logo.png", 18_400),
  ],
  photos: [
    entry("file", "photos/sunset.png", "sunset.png", 92_000),
    entry("file", "photos/notes.txt", "notes.txt", 1_200),
  ],
};

function stateFor(relPath: string): DriveUIData {
  const key = normalizeSharePath(relPath);
  const files = MOCK_TREE[key] ?? [];
  return {
    user: { username: "", name: "", role: "user", roots: [] },
    cwd: key,
    directory: { location: key, files },
    plugins: [],
  };
}

/** Canned directory operations that browse {@link MOCK_TREE} in-memory. */
export function createMockShareOperations(): DriveAPIOperations {
  let cwd = "";
  return {
    refreshState: async () => stateFor(cwd),
    changeDir: async (to) => {
      cwd = to;
      return stateFor(cwd);
    },
    listDirectory: async (at) => {
      cwd = at;
      return stateFor(at);
    },
    search: async () => [],
    createFolder: async () => stateFor(cwd),
    createFile: async () => stateFor(cwd),
    renameItem: async () => stateFor(cwd),
    deleteItems: async () => stateFor(cwd),
    downloadFile: async () => {},
    readFileBlob: async () => new Blob(["mock"], { type: "text/plain" }),
    checkUploadReady: async () => {},
    listStars: async () => [],
    listEntriesByPaths: async () => [],
    setStar: async () => {},
    uploadFiles: async () => stateFor(cwd),
  };
}

export function makeMockSharePublicMeta(
  overrides: Partial<WgwSharePublicMeta> = {},
): WgwSharePublicMeta {
  return {
    token: overrides.token ?? "tok_demo",
    name: overrides.name ?? "Team handoff",
    targetType: overrides.targetType ?? "dir",
    publicAccess: overrides.publicAccess ?? "read",
    permission: overrides.permission ?? "read",
    requiresConfirmation: overrides.requiresConfirmation ?? false,
    expiresAt: overrides.expiresAt ?? null,
  };
}

/** Build a mock {@link ShareApiSource} for the route-level app. */
export function createMockShareApiSource(
  meta: WgwSharePublicMeta = makeMockSharePublicMeta(),
): ShareApiSource {
  return {
    loadMeta: async () => meta,
    createOperations: () => createMockShareOperations(),
    requestAccess: async () => ({ status: "pending" }),
    confirm: async () => ({ accessToken: "mock-access", token: meta.token, permission: "read" }),
  };
}
