/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from "vitest";
import {
  readTextEditorSheetPaddingToken,
  resolveTextEditorSheetMarginPx,
  TEXT_EDITOR_SHEET_PADDING_FALLBACK,
} from "./text-editor-sheet-margin";

describe("text editor sheet margin tokens", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--text-editor-sheet-padding");
    document.body.innerHTML = "";
  });

  it("resolves the default sheet padding token to 72px at 96dpi", () => {
    document.documentElement.style.setProperty(
      "--text-editor-sheet-padding",
      TEXT_EDITOR_SHEET_PADDING_FALLBACK,
    );

    expect(resolveTextEditorSheetMarginPx()).toBe(72);
    expect(readTextEditorSheetPaddingToken()).toBe(TEXT_EDITOR_SHEET_PADDING_FALLBACK);
  });

  it("reads scoped overrides from the nearest `.text-editor` host", () => {
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.style.setProperty("--text-editor-sheet-padding", "1rem");
    document.body.appendChild(editorRoot);

    expect(readTextEditorSheetPaddingToken(editorRoot)).toBe("1rem");
    expect(resolveTextEditorSheetMarginPx(editorRoot)).toBe(16);
  });
});
