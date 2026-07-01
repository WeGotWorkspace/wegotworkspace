/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Editor } from "@tiptap/react";
import { printTextEditorSheet, TEXT_EDITOR_PRINT_FORMATTED_CLASS } from "./text-editor-print";

function createMockEditor(editorRoot: HTMLElement, proseMirror?: HTMLElement): Editor {
  const dom = proseMirror ?? editorRoot.querySelector(".ProseMirror") ?? editorRoot;
  return {
    view: {
      dom,
    },
  } as Editor;
}

function buildEditorDom(options?: { viewSource?: boolean; hideFormatted?: boolean }) {
  const source = document.createElement("div");
  source.className = "text-editor__source text-editor-source";
  source.textContent = "# Markdown source";

  const formatted = document.createElement("div");
  formatted.className = "text-editor__formatted";
  if (options?.hideFormatted) {
    formatted.style.display = "none";
  }

  const sheet = document.createElement("div");
  sheet.className = "text-editor-sheet text-editor-sheet--fill";
  const surface = document.createElement("div");
  surface.className = "text-editor-sheet__surface";
  const prose = document.createElement("div");
  prose.className = "ProseMirror text-editor-prose";
  prose.textContent = "Formatted document body";
  surface.appendChild(prose);
  sheet.appendChild(surface);
  formatted.appendChild(sheet);

  const body = document.createElement("div");
  body.className = "text-editor__body";
  body.appendChild(source);
  body.appendChild(formatted);

  const editorRoot = document.createElement("div");
  editorRoot.className = cn("text-editor", options?.viewSource && "text-editor--view-source");
  editorRoot.appendChild(body);
  document.body.appendChild(editorRoot);

  return { editorRoot, surface, source, formatted, prose };
}

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

describe("printTextEditorSheet", () => {
  beforeEach(() => {
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("text-editor-print-active");
    document.documentElement.style.removeProperty("--text-editor-print-page-margin");
    document.documentElement.style.removeProperty("--text-editor-print-prose-font-size");
    document.body.classList.remove("text-editor-print-active");
    document
      .querySelectorAll(`.${TEXT_EDITOR_PRINT_FORMATTED_CLASS}`)
      .forEach((node) => node.classList.remove(TEXT_EDITOR_PRINT_FORMATTED_CLASS));
  });

  it("activates print classes and mirrors margin tokens", () => {
    const surface = document.createElement("div");
    surface.className = "text-editor-sheet__surface";
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.appendChild(surface);
    document.body.appendChild(editorRoot);

    printTextEditorSheet(createMockEditor(editorRoot));

    expect(document.documentElement.classList.contains("text-editor-print-active")).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--text-editor-print-page-margin")).toBe(
      "0.75in",
    );
    expect(
      document.documentElement.style.getPropertyValue("--text-editor-print-prose-font-size"),
    ).toBe("16px");

    editorRoot.remove();
  });

  it("prints the formatted sheet in view-source split layout", () => {
    const { editorRoot, surface, source, prose } = buildEditorDom({ viewSource: true });

    printTextEditorSheet(createMockEditor(editorRoot, prose));

    expect(surface.classList.contains("text-editor-sheet__surface--print")).toBe(true);
    expect(editorRoot.classList.contains(TEXT_EDITOR_PRINT_FORMATTED_CLASS)).toBe(true);
    expect(source.classList.contains("text-editor-sheet__surface--print")).toBe(false);

    editorRoot.remove();
  });

  it("finds the formatted sheet when the formatted pane is display:none (portrait source view)", () => {
    const { editorRoot, surface, prose } = buildEditorDom({
      viewSource: true,
      hideFormatted: true,
    });

    printTextEditorSheet(createMockEditor(editorRoot, prose));

    expect(surface.classList.contains("text-editor-sheet__surface--print")).toBe(true);
    expect(editorRoot.classList.contains(TEXT_EDITOR_PRINT_FORMATTED_CLASS)).toBe(true);

    editorRoot.remove();
  });
});
