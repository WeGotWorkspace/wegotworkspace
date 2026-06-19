import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/ui/tooltip";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { DocsHomePane } from "@/docs-core/src/docs-home-pane";
import { docsLabels } from "@/docs-core/src/docs-labels";
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

function renderPane(viewMode: "list" | "grid" = "list") {
  const onOpenFile = vi.fn();
  render(
    <TooltipProvider>
      <DocsHomePane
        labels={docsLabels}
        files={[FILE]}
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
      />
    </TooltipProvider>,
  );
  return { onOpenFile };
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
