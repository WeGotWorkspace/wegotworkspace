import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/ui/tooltip";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { DocsHomePane } from "@/docs-core/src/docs-home-pane";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { driveLabels } from "@/drive-core/src/drive-labels";
import "@/docs-core/src/docs-home-workspace.css";
import "@/drive-core/src/drive-browser.css";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
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

const FILE: DriveFile = {
  id: "doc-1",
  category: "document",
  date: "Now",
  title: "Roadmap.md",
  excerpt: "",
  body: [],
  notebook: "",
  tags: [],
  wordCount: 0,
  parent: "My Drive",
  kind: "doc",
  size: "2.0 KB",
  apiPath: "/users/alice/Roadmap.md",
  location: "My Drive",
};

const FILE2: DriveFile = {
  ...FILE,
  id: "doc-2",
  title: "Notes.md",
  apiPath: "/users/alice/Notes.md",
};

function renderPane(
  viewMode: "list" | "grid" = "list",
  files: DriveFile[] = [FILE],
  batchProps?: {
    batchStar?: (ids: string[]) => void;
    requestMoveSelected?: (ids: string[]) => void;
    requestDeleteSelected?: (ids: string[]) => void;
  },
) {
  const onOpenFile = vi.fn();
  render(
    <TooltipProvider>
      <DocsHomePane
        labels={docsLabels}
        files={files}
        loading={false}
        loadingMore={false}
        hasMore={false}
        error={null}
        query=""
        onQueryChange={() => {}}
        viewMode={viewMode}
        onViewModeChange={() => {}}
        onLoadMore={() => {}}
        onOpenFile={onOpenFile}
        sidebarOpen={false}
        onToggleSidebar={() => {}}
        batchStar={batchProps?.batchStar ?? vi.fn()}
        requestMoveSelected={batchProps?.requestMoveSelected ?? vi.fn()}
        requestDeleteSelected={batchProps?.requestDeleteSelected ?? vi.fn()}
      />
    </TooltipProvider>,
  );
  return { onOpenFile };
}

function selectTwoItems(viewMode: "list" | "grid") {
  const first =
    viewMode === "list"
      ? screen.getByText(FILE.title).closest("tr")!
      : screen.getByRole("button", { name: FILE.title });
  const second =
    viewMode === "list"
      ? screen.getByText(FILE2.title).closest("tr")!
      : screen.getByRole("button", { name: FILE2.title });
  fireEvent.click(first);
  fireEvent.click(second, { metaKey: true });
}

describe("DocsHomePane file interaction", () => {
  it("selects on single click in list view without opening", () => {
    const { onOpenFile } = renderPane("list");

    const row = screen.getByText(FILE.title).closest("tr");
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    expect(row!.className).toContain("drive-list-row--selected");
    expect(onOpenFile).not.toHaveBeenCalled();
  });

  it("opens on double click in list view", () => {
    const { onOpenFile } = renderPane("list");

    const row = screen.getByText(FILE.title).closest("tr");
    fireEvent.doubleClick(row!);

    expect(onOpenFile).toHaveBeenCalledWith(FILE);
  });

  it("selects on single click in grid view without opening", () => {
    const { onOpenFile } = renderPane("grid");

    const hit = screen.getByRole("button", { name: FILE.title });
    fireEvent.click(hit);

    expect(hit.closest(".drive-file-tile")!.className).toContain("drive-file-tile--selected");
    expect(onOpenFile).not.toHaveBeenCalled();
  });

  it("opens on double click in grid view", () => {
    const { onOpenFile } = renderPane("grid");

    const hit = screen.getByRole("button", { name: FILE.title });
    fireEvent.doubleClick(hit);

    expect(onOpenFile).toHaveBeenCalledWith(FILE);
  });
});

describe("DocsHomePane multi-select batch bar", () => {
  it("shows the batch selection bar in list view when two items are selected", () => {
    renderPane("list", [FILE, FILE2]);
    selectTwoItems("list");
    expect(screen.getByText("2 selected")).toBeTruthy();
  });

  it("shows the batch selection bar in grid view when two items are selected", () => {
    renderPane("grid", [FILE, FILE2]);
    selectTwoItems("grid");
    expect(screen.getByText("2 selected")).toBeTruthy();
  });

  it("hides the batch selection bar after Done is clicked", () => {
    renderPane("list", [FILE, FILE2]);
    selectTwoItems("list");
    fireEvent.click(screen.getByRole("button", { name: driveLabels.selectionDone }));
    expect(screen.queryByText("2 selected")).toBeNull();
  });
});
