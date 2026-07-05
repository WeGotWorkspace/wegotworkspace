/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewLightbox } from "@/preview-lightbox/src/preview-lightbox";
import "@/preview-lightbox/src/preview-lightbox.css";

type DialogWithKeyHandler = HTMLDialogElement & {
  _previewLightboxKeydown?: (event: KeyboardEvent) => void;
};

function installDialogPolyfill() {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    close?: () => void;
  };
  if (proto.showModal && proto.close) return;

  proto.showModal = function (this: DialogWithKeyHandler) {
    this.setAttribute("open", "");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
      if (this.dispatchEvent(cancelEvent)) this.close();
    };
    this._previewLightboxKeydown = onKeyDown;
    this.addEventListener("keydown", onKeyDown);
  };

  proto.close = function (this: DialogWithKeyHandler) {
    this.removeAttribute("open");
    const onKeyDown = this._previewLightboxKeydown;
    if (onKeyDown) {
      this.removeEventListener("keydown", onKeyDown);
      delete this._previewLightboxKeydown;
    }
  };
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installDialogPolyfill();
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
    expect(screen.getByRole("button", { name: "Close preview" })).toBeTruthy();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <PreviewLightbox open title="Notes.txt" onClose={onClose}>
        <p>Body</p>
      </PreviewLightbox>,
    );
    const dialog = screen.getByRole("dialog", { name: "Notes.txt" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <PreviewLightbox open title="Cover.png" onClose={onClose}>
        <p>Body</p>
      </PreviewLightbox>,
    );
    const dialog = screen.getByRole("dialog", { name: "Cover.png" });
    fireEvent.click(dialog);
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
