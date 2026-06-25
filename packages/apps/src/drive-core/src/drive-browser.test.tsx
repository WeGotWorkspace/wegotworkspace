import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DriveGridView, DriveListView } from "@/drive-core/src/drive-browser";
import { driveLabels } from "@/drive-core/src/drive-labels";
import type { DriveFile } from "@/drive-core/src/drive-models";
import "@/drive-core/src/drive-browser.css";

const noop = () => {};

afterEach(() => {
  cleanup();
});

const FILE: DriveFile = {
  id: "1",
  category: "document",
  date: "Now",
  title: "Notes.md",
  excerpt: "",
  body: [],
  notebook: "",
  tags: [],
  wordCount: 0,
  parent: "My Drive",
  kind: "doc",
  size: "2.0 KB",
  apiPath: "/users/alice/Notes.md",
};

function baseBrowserProps(overrides: Partial<Parameters<typeof DriveListView>[0]> = {}) {
  return {
    items: [FILE],
    activeId: null,
    selectedIds: [],
    starred: {},
    imagePreviewUrls: {},
    labels: driveLabels,
    inTrash: false,
    selectionMode: false,
    isTouch: false,
    isItemDragging: () => false,
    itemDragHandlers: () => ({ onDragStart: noop, onDragEnd: noop }),
    folderDropZoneProps: () => ({}),
    onSelect: noop,
    onOpen: noop,
    onStar: noop,
    onDownload: noop,
    onRename: noop,
    onMove: noop,
    onTrash: noop,
    onLongPress: noop,
    ...overrides,
  };
}

describe("DriveGridView tile interaction", () => {
  it("uses a full-tile hit target and selects on single click", () => {
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    const { container } = render(
      <div className="drive-workspace">
        <DriveGridView {...baseBrowserProps({ onSelect, onOpen })} />
      </div>,
    );

    const hit = screen.getByRole("button", { name: FILE.title });
    expect(hit.className).toContain("drive-tile__hit");
    expect(container.querySelector(".drive-file-tile__preview")).toBeTruthy();

    fireEvent.click(hit);
    expect(onSelect).toHaveBeenCalledWith(FILE.id, expect.any(Object));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens on double click", () => {
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    render(
      <div className="drive-workspace">
        <DriveGridView {...baseBrowserProps({ onSelect, onOpen })} />
      </div>,
    );

    const hit = screen.getByRole("button", { name: FILE.title });
    fireEvent.doubleClick(hit);
    expect(onOpen).toHaveBeenCalledWith(FILE);
  });
});

describe("DriveListView", () => {
  it("renders the Kind column by default", () => {
    render(<DriveListView {...baseBrowserProps()} />);
    expect(screen.getByRole("columnheader", { name: "Kind" })).toBeTruthy();
  });
});
