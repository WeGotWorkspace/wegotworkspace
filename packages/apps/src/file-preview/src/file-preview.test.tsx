/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FilePreview } from "@/file-preview/src/file-preview";
import "@/file-preview/src/file-preview.css";

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
