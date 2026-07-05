/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveShellState } from "@/drive-core/src/use-drive-shell";
import { useDriveList } from "@/drive-core/src/use-drive-list";

const setSelectedIds = vi.fn();
const selectView = vi.fn();

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({ showError: vi.fn() }),
}));

vi.mock("@/hooks/use-is-touch", () => ({
  useIsTouch: () => false,
}));

vi.mock("@/hooks/use-selection-reset-on-key-change", () => ({
  useSelectionResetOnKeyChange: () => {},
}));

vi.mock("@/drive-core/src/use-persisted-drive-view-mode", () => ({
  usePersistedDriveViewMode: () => ["grid", vi.fn()] as const,
}));

vi.mock("@/drive-core/src/use-drive-grid-previews", () => ({
  useDriveGridPreviews: () => ({ filePreviews: {} }),
}));

vi.mock("@/hooks/use-workspace-list-controller", () => ({
  useWorkspaceListController: () => ({
    selectedIds: [],
    setSelectedIds,
    selectionMode: false,
    setSelectionMode: vi.fn(),
    handleSelect: vi.fn(),
    enterSelectionFor: vi.fn(),
    exitSelection: vi.fn(),
    isItemDragging: () => false,
    itemDragHandlers: () => ({}),
    sidebarDropZoneProps: {},
    beginOptimisticUpdate: vi.fn(),
    queueMutation: vi.fn(),
    undoLatest: vi.fn(),
    navigateListByKeyboard: vi.fn(),
  }),
}));

const FOLDER: DriveFile = {
  id: "folder-1",
  category: "document",
  date: "Now",
  title: "Projects",
  excerpt: "",
  body: [],
  notebook: "",
  tags: [],
  wordCount: 0,
  parent: "My Drive",
  kind: "folder",
  size: "—",
};

const MARKDOWN: DriveFile = {
  ...FOLDER,
  id: "doc-1",
  title: "Notes.md",
  kind: "doc",
  size: "1 KB",
  apiPath: "/users/alice/Notes.md",
};

const PDF: DriveFile = {
  ...FOLDER,
  id: "pdf-1",
  title: "Report.pdf",
  kind: "file",
  size: "120 KB",
  apiPath: "/users/alice/Report.pdf",
};

function createShell(viewResetKey = "folder:My Drive"): DriveShellState {
  return {
    files: [FOLDER, MARKDOWN, PDF],
    setFiles: vi.fn(),
    liveSearchResults: null,
    starredItems: [],
    starred: {},
    view: { type: "folder", path: "My Drive" },
    searchQuery: "",
    currentUsername: "alice",
    operations: undefined,
    viewResetKey,
    selectView,
  } as unknown as DriveShellState;
}

describe("useDriveList openFile", () => {
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
  });

  it("navigates into folders on double-click open", () => {
    const shell = createShell();
    const { result } = renderHook(() => useDriveList({ shell }));

    act(() => {
      result.current.openFile(FOLDER);
    });

    expect(selectView).toHaveBeenCalledWith({ type: "folder", path: "My Drive/Projects" });
    expect(result.current.detailOpen).toBe(false);
  });

  it("opens Docs editor files via onOpenDocsFile", () => {
    const onOpenDocsFile = vi.fn();
    const shell = createShell();
    const { result } = renderHook(() => useDriveList({ shell, onOpenDocsFile }));

    act(() => {
      result.current.openFile(MARKDOWN);
    });

    expect(onOpenDocsFile).toHaveBeenCalledWith("/users/alice/Notes.md");
    expect(result.current.detailOpen).toBe(false);
  });

  it("opens the detail preview pane for non-Docs files", () => {
    const shell = createShell();
    const { result } = renderHook(() => useDriveList({ shell }));

    act(() => {
      result.current.openFile(PDF);
    });

    expect(result.current.activeId).toBe(PDF.id);
    expect(setSelectedIds).toHaveBeenCalledWith([PDF.id]);
    expect(result.current.detailOpen).toBe(true);
  });

  it("does not open the detail pane on single-click selection alone", () => {
    const shell = createShell();
    const { result } = renderHook(() => useDriveList({ shell }));

    act(() => {
      result.current.handleSelect(PDF.id, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as never);
    });

    expect(result.current.detailOpen).toBe(false);
  });

  it("resets detailOpen when the folder view changes", () => {
    const shell = createShell("folder:My Drive");
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useDriveList({ shell: { ...shell, viewResetKey: resetKey } }),
      { initialProps: { resetKey: "folder:My Drive" } },
    );

    act(() => {
      result.current.openFile(PDF);
    });
    expect(result.current.detailOpen).toBe(true);

    act(() => {
      rerender({ resetKey: "folder:My Drive/Projects" });
    });

    expect(result.current.detailOpen).toBe(false);
  });
});
