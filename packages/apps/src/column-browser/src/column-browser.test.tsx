/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColumnBrowser, type ColumnBrowserColumn } from "@/column-browser/src/column-browser";
import "@/column-browser/src/column-browser.css";

const COLUMNS: ColumnBrowserColumn[] = [
  {
    id: "my-drive",
    title: "My Drive",
    items: [
      { id: "f1", title: "Studio Assets", kind: "folder" },
      { id: "f2", title: "Notes.md", kind: "file" },
    ],
  },
  {
    id: "studio",
    title: "Studio Assets",
    items: [{ id: "f3", title: "logo.png", kind: "file" }],
  },
];

afterEach(() => {
  cleanup();
});

describe("ColumnBrowser", () => {
  it("renders columns and invokes selection callback", () => {
    const onSelectItem = vi.fn();
    render(<ColumnBrowser columns={COLUMNS} selectedItemId="f2" onSelectItem={onSelectItem} />);
    expect(screen.getByRole("tree", { name: "Folder columns" })).toBeTruthy();
    fireEvent.click(screen.getByRole("treeitem", { name: /Studio Assets/i }));
    expect(onSelectItem).toHaveBeenCalledWith(0, expect.objectContaining({ id: "f1" }));
  });

  it("shows empty state copy per column", () => {
    render(
      <ColumnBrowser
        columns={[{ id: "empty", title: "Empty", items: [], emptyLabel: "No files" }]}
        onSelectItem={() => {}}
      />,
    );
    expect(screen.getByText("No files")).toBeTruthy();
  });
});
