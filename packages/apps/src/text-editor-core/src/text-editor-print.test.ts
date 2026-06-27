/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Editor } from "@tiptap/react";
import {
  TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR,
  textEditorPrintPageName,
} from "./text-editor-pagination";
import { printTextEditorSheet } from "./text-editor-print";

function createMockEditor(surface: HTMLElement | null): Editor {
  return {
    view: {
      dom: surface ?? document.createElement("div"),
    },
  } as Editor;
}

describe("text editor pagination print helpers", () => {
  it("maps each selectable format to a named @page rule", () => {
    expect(textEditorPrintPageName("a4")).toBe("text-editor-a4");
    expect(textEditorPrintPageName("letter")).toBe("text-editor-letter");
    expect(textEditorPrintPageName("legal")).toBe("text-editor-legal");
    expect(textEditorPrintPageName("a3")).toBe("text-editor-a3");
    expect(textEditorPrintPageName("a5")).toBe("text-editor-a5");
  });
});

describe("printTextEditorSheet", () => {
  beforeEach(() => {
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("text-editor-print-active");
    document.documentElement.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    document.body.classList.remove("text-editor-print-active");
    document.body.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
  });

  it("sets the page-format data attribute during Docs print", () => {
    const surface = document.createElement("div");
    surface.className = "text-editor-sheet__surface";
    const sheet = document.createElement("div");
    sheet.className = "text-editor-sheet";
    sheet.appendChild(surface);
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.appendChild(sheet);
    document.body.appendChild(editorRoot);

    const editor = createMockEditor(editorRoot);
    printTextEditorSheet(editor, "letter");

    expect(document.documentElement.getAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe("letter");
    expect(document.body.getAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe("letter");
    expect(document.documentElement.classList.contains("text-editor-print-active")).toBe(true);

    editorRoot.remove();
  });

  it("does not set the page-format attribute when format is omitted", () => {
    const surface = document.createElement("div");
    surface.className = "text-editor-sheet__surface";
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.appendChild(surface);
    document.body.appendChild(editorRoot);

    printTextEditorSheet(createMockEditor(editorRoot));

    expect(document.documentElement.hasAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe(false);
    expect(document.body.hasAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe(false);

    editorRoot.remove();
  });
});
