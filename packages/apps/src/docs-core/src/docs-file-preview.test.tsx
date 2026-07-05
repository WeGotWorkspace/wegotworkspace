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

  it("uses fallback when content is empty", () => {
    render(<DocsFilePreview fileName="Spec.md" content="   " fallback={<p>fallback text</p>} />);

    expect(screen.getByText("fallback text")).toBeTruthy();
    expect(screen.queryByTestId("text-editor")).toBeNull();
  });
});
