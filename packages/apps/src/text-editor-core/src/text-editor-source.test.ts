import { describe, expect, it } from "vitest";
import { textEditorSourceLineCount } from "@/text-editor-core/src/text-editor-source";

describe("textEditorSourceLineCount", () => {
  it("returns 1 for empty buffer", () => {
    expect(textEditorSourceLineCount("")).toBe(1);
  });

  it("counts newline-separated lines", () => {
    expect(textEditorSourceLineCount("a\nb\nc")).toBe(3);
    expect(textEditorSourceLineCount("a\n")).toBe(2);
  });

  it("normalizes CRLF", () => {
    expect(textEditorSourceLineCount("a\r\nb")).toBe(2);
  });
});
