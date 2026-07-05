/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilePreview } from "@/file-preview/src/file-preview";
import "@/file-preview/src/file-preview.css";

vi.mock("@/text-editor-core/src", () => ({
  TextEditor: ({ content, editable }: { content?: string; editable?: boolean }) => (
    <div data-testid="text-editor" data-editable={String(editable ?? true)}>
      {content}
    </div>
  ),
}));

const SAMPLE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='160'%3E%3Crect width='240' height='160' fill='%2310b981'/%3E%3C/svg%3E";

function parseAspectRatio(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  if (trimmed.includes("/")) {
    const [width, height] = trimmed.split("/").map((part) => Number(part.trim()));
    return width / height;
  }
  return Number(trimmed);
}

afterEach(() => {
  cleanup();
});

describe("FilePreview tile variant", () => {
  it("mounts read-only docs editor for rich markdown tiles when in view", () => {
    render(
      <FilePreview
        variant="tile"
        fileKind="doc"
        fileName="Spec.md"
        preview={{ kind: "docs", content: "# Title\n\nBody" }}
      />,
    );

    expect(screen.getByTestId("text-editor").getAttribute("data-editable")).toBe("false");
    expect(screen.getByTestId("file-preview-tile-docs-lazy").getAttribute("data-mounted")).toBe(
      "true",
    );
  });

  it("defers docs editor mount until the tile intersects the viewport", async () => {
    class MockIntersectionObserver {
      static last: MockIntersectionObserver | null = null;

      constructor(private callback: IntersectionObserverCallback) {
        MockIntersectionObserver.last = this;
      }

      observe() {}

      disconnect() {}

      emit(isIntersecting: boolean) {
        this.callback([{ isIntersecting } as IntersectionObserverEntry], this as never);
      }
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(
      <FilePreview
        variant="tile"
        fileKind="doc"
        fileName="Spec.md"
        preview={{ kind: "docs", content: "# Title\n\nBody" }}
      />,
    );

    const lazy = screen.getByTestId("file-preview-tile-docs-lazy");
    expect(lazy.getAttribute("data-mounted")).toBe("false");
    expect(screen.queryByTestId("text-editor")).toBeNull();

    MockIntersectionObserver.last?.emit(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("text-editor")).toBeTruthy();
    expect(lazy.getAttribute("data-mounted")).toBe("true");
  });
});

describe("FilePreview lightbox variant", () => {
  it("reserves aspect ratio from blob preview dimensions before media loads", () => {
    render(
      <FilePreview
        variant="lightbox"
        fileKind="image"
        fileName="cover.png"
        preview={{ kind: "blob-url", url: SAMPLE_IMAGE, width: 240, height: 160 }}
      />,
    );

    const frame = screen.getByTestId("file-preview-lightbox-frame");
    expect(parseAspectRatio(frame.style.getPropertyValue("aspect-ratio"))).toBeCloseTo(240 / 160);
  });

  it("reserves fallback aspect ratio while blob preview is still loading", () => {
    render(
      <FilePreview variant="lightbox" fileKind="image" fileName="cover.png" preview={undefined} />,
    );

    const frame = screen.getByTestId("file-preview-lightbox-frame");
    expect(parseAspectRatio(frame.style.getPropertyValue("aspect-ratio"))).toBeCloseTo(4 / 3);
  });
});
