/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewLightbox } from "@/preview-lightbox/src/preview-lightbox";
import "@/preview-lightbox/src/preview-lightbox.css";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe("PreviewLightbox", () => {
  it("renders dialog with filename and close control", () => {
    render(
      <PreviewLightbox open title="Roadmap.md" onClose={() => {}}>
        <p>Preview body</p>
      </PreviewLightbox>,
    );
    expect(screen.getByRole("dialog", { name: "Roadmap.md" })).toBeTruthy();
    expect(screen.getByText("Preview body")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Close preview" }).length).toBeGreaterThan(0);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <PreviewLightbox open title="Notes.txt" onClose={onClose}>
        <p>Body</p>
      </PreviewLightbox>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when scrim is clicked", () => {
    const onClose = vi.fn();
    render(
      <PreviewLightbox open title="Cover.png" onClose={onClose}>
        <p>Body</p>
      </PreviewLightbox>,
    );
    const scrims = screen.getAllByRole("button", { name: "Close preview" });
    fireEvent.click(scrims[0]!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables prev/next when at boundaries", () => {
    render(
      <PreviewLightbox
        open
        title="A.md"
        onClose={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        hasPrevious={false}
        hasNext={false}
      >
        <p>Body</p>
      </PreviewLightbox>,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
  });
});
