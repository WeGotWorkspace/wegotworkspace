/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocsFilePreview } from "@/docs-core/src/docs-file-preview";

vi.mock("@/text-editor-core/src", () => ({
  TextEditor: ({ content, editable }: { content?: string; editable?: boolean }) => (
    <div data-testid="text-editor" data-editable={String(editable ?? true)}>
      {content}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("DocsFilePreview", () => {
  it("renders read-only TextEditor with raw content", () => {
    render(
      <DocsFilePreview fileName="Spec.md" content="# Title\n\nBody" fallback={<p>fallback</p>} />,
    );

    const editor = screen.getByTestId("text-editor");
    expect(editor.getAttribute("data-editable")).toBe("false");
    expect(editor.textContent).toContain("# Title");
  });

  it("renders read-only TextEditor for empty markdown files", () => {
    render(<DocsFilePreview fileName="Untitled.md" content="" fallback={<p>fallback text</p>} />);

    const editor = screen.getByTestId("text-editor");
    expect(editor.getAttribute("data-editable")).toBe("false");
    expect(screen.queryByText("fallback text")).toBeNull();
  });

  it("applies tile variant styling for grid previews", () => {
    const { container } = render(
      <DocsFilePreview fileName="Spec.md" content="# Title" variant="tile" fallback={<p>x</p>} />,
    );

    expect(container.querySelector(".docs-file-preview--tile")).toBeTruthy();
    expect(container.querySelector('[data-variant="tile"]')).toBeTruthy();
  });
});
