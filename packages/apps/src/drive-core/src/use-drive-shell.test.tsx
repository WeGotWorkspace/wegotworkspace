import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { driveFileFromEntry } from "@/drive-core/src/drive-file-utils";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import { useDriveShell } from "@/drive-core/src/use-drive-shell";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({
    show: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

const USER = "alice";
const MY_DRIVE_CWD = `/users/${USER}`;

function directoryEntry(name: string) {
  return {
    name,
    path: `${MY_DRIVE_CWD}/${name}`,
    type: "file" as const,
    size: 100,
    time: 1,
    permissions: 644,
  };
}

function driveData(fileNames: string[]): DriveUIData {
  return {
    user: { username: USER, name: USER, role: "user", roots: ["/users"] },
    cwd: MY_DRIVE_CWD,
    directory: {
      location: MY_DRIVE_CWD,
      files: fileNames.map(directoryEntry),
    },
    plugins: [],
  };
}

const session: WorkspaceSession = {
  user: { displayName: USER, initials: "A", username: USER },
  viewerInboxLabel: USER,
};

function createOperations(changeDir: DriveAPIOperations["changeDir"]): DriveAPIOperations {
  return {
    refreshState: vi.fn(),
    changeDir,
    listDirectory: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    createFolder: vi.fn(),
    createFile: vi.fn(),
    renameItem: vi.fn(),
    deleteItems: vi.fn(),
    downloadFile: vi.fn(),
    readFileBlob: vi.fn(),
    checkUploadReady: vi.fn(),
    listStars: vi.fn().mockResolvedValue([]),
    listEntriesByPaths: vi.fn().mockResolvedValue([]),
    setStar: vi.fn(),
    uploadFiles: vi.fn(),
  };
}

describe("useDriveShell folder listing sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("refetches the folder after returning from Recent so uploaded files stay visible", async () => {
    const bootstrap = driveData(["old.txt"]);
    const refreshed = driveData(["old.txt", "uploaded.txt"]);
    const changeDir = vi.fn().mockResolvedValue(refreshed);
    const operations = createOperations(changeDir);

    const { result, unmount } = renderHook(() =>
      useDriveShell({
        data: bootstrap,
        session,
        operations,
      }),
    );

    await waitFor(() => {
      expect(result.current.folderListingPending).toBe(false);
    });

    act(() => {
      result.current.setFiles([
        driveFileFromEntry(directoryEntry("old.txt"), USER),
        driveFileFromEntry(directoryEntry("uploaded.txt"), USER),
      ]);
    });

    expect(result.current.files.map((file) => file.title)).toEqual(["old.txt", "uploaded.txt"]);

    act(() => {
      result.current.selectView({ type: "recent" });
    });

    expect(result.current.view.type).toBe("recent");
    expect(result.current.files.map((file) => file.title)).toEqual(["old.txt", "uploaded.txt"]);

    changeDir.mockClear();

    act(() => {
      result.current.selectView({ type: "folder", path: "My Drive" });
    });

    await waitFor(() => {
      expect(changeDir).toHaveBeenCalled();
      expect(result.current.files.map((file) => file.title)).toEqual(["old.txt", "uploaded.txt"]);
    });

    unmount();
  });
});
