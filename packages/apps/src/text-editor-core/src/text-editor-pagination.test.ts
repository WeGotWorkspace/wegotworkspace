/** @vitest-environment jsdom */
import { Editor } from "@tiptap/react";
import { PAGE_SIZES } from "tiptap-pagination-plus";
import { afterEach, describe, expect, it } from "vitest";
import { createTextEditorExtensions } from "./text-editor-extensions";
import {
  applyTextEditorPageFormat,
  clearTextEditorPaginationContentVariables,
  textEditorPageWidth,
} from "./text-editor-pagination";
import { resolveTextEditorSheetMarginPx } from "./text-editor-sheet-margin";

function mountTextEditorHost(): HTMLElement {
  const host = document.createElement("div");
  host.className = "text-editor";
  host.style.setProperty("--text-editor-sheet-padding", "0.75in");
  document.body.appendChild(host);
  return host;
}

function createPaginatedEditor(host: HTMLElement, content: string): Editor {
  const mount = document.createElement("div");
  host.appendChild(mount);
  return new Editor({
    element: mount,
    extensions: createTextEditorExtensions({ format: "html", pagination: true, pageFormat: "a4" }),
    content,
  });
}

describe("text editor pagination", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clears stale per-page content height variables from the ProseMirror root", () => {
    const dom = document.createElement("div");
    dom.style.setProperty("--rm-page-content-1", "800px");
    dom.style.setProperty("--rm-page-content-5", "900px");
    dom.style.setProperty("--rm-page-content-first", "850px");
    dom.style.setProperty("--rm-page-content-general", "820px");
    dom.style.setProperty("--rm-max-content-child-height", "790px");
    dom.style.setProperty("--rm-margin-top", "72px");

    clearTextEditorPaginationContentVariables(dom);

    expect(dom.style.getPropertyValue("--rm-page-content-1")).toBe("");
    expect(dom.style.getPropertyValue("--rm-page-content-5")).toBe("");
    expect(dom.style.getPropertyValue("--rm-page-content-first")).toBe("");
    expect(dom.style.getPropertyValue("--rm-page-content-general")).toBe("");
    expect(dom.style.getPropertyValue("--rm-max-content-child-height")).toBe("");
    expect(dom.style.getPropertyValue("--rm-margin-top")).toBe("72px");
  });

  it("restores A4 layout after an A4 → A3 → A4 round-trip", async () => {
    const host = mountTextEditorHost();
    const editor = createPaginatedEditor(
      host,
      "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>",
    );

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const initialMargin = resolveTextEditorSheetMarginPx(host);
    const initialWidth = textEditorPageWidth("a4");
    const initialHeight = PAGE_SIZES.A4.pageHeight;

    // Simulate stale vars left over from a larger page count (the reported bug).
    editor.view.dom.style.setProperty("--rm-page-content-8", "900px");
    editor.view.dom.style.setProperty("--rm-page-content-12", "900px");
    editor.storage.PaginationPlus.headerHeight.set(8, 42);
    editor.storage.PaginationPlus.footerHeight.set(8, 42);

    applyTextEditorPageFormat(editor, "a3");
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    applyTextEditorPageFormat(editor, "a4");
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const storage = editor.storage.PaginationPlus;
    expect(storage.pageWidth).toBe(initialWidth);
    expect(storage.pageHeight).toBe(initialHeight);
    expect(storage.marginTop).toBe(initialMargin);
    expect(storage.marginBottom).toBe(initialMargin);
    expect(storage.marginLeft).toBe(initialMargin);
    expect(storage.marginRight).toBe(initialMargin);
    expect(editor.view.dom.style.getPropertyValue("--rm-page-content-12")).toBe("");
    expect(editor.view.dom.style.getPropertyValue("--rm-page-content-8")).toBe("");
    expect(storage.headerHeight.size).toBe(0);
    expect(storage.footerHeight.size).toBe(0);

    editor.destroy();
  });
});
