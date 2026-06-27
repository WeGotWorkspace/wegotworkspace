/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from "vitest";
import {
  readTextEditorProseFontSizeToken,
  resolveTextEditorProseFontSizePx,
  TEXT_EDITOR_PROSE_FONT_SIZE_FALLBACK,
} from "./text-editor-prose-font";

describe("text editor prose font tokens", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--text-editor-prose-font-size");
    document.body.innerHTML = "";
  });

  it("resolves the default prose font-size token to 16px", () => {
    document.documentElement.style.setProperty(
      "--text-editor-prose-font-size",
      TEXT_EDITOR_PROSE_FONT_SIZE_FALLBACK,
    );

    expect(resolveTextEditorProseFontSizePx()).toBe(16);
    expect(readTextEditorProseFontSizeToken()).toBe(TEXT_EDITOR_PROSE_FONT_SIZE_FALLBACK);
  });

  it("reads scoped overrides from the nearest `.text-editor` host", () => {
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.style.setProperty("--text-editor-prose-font-size", "1.125rem");
    document.body.appendChild(editorRoot);

    expect(readTextEditorProseFontSizeToken(editorRoot)).toBe("1.125rem");
    expect(resolveTextEditorProseFontSizePx(editorRoot)).toBe(18);
  });
});
