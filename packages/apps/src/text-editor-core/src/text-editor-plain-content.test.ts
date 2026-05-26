import { describe, expect, it } from "vitest";
import { plainTextToTiptapContent } from "@/text-editor-core/src/text-editor-plain-content";

describe("plainTextToTiptapContent", () => {
  it("preserves line breaks as paragraphs", () => {
    expect(plainTextToTiptapContent("line one\nline two")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "line one" }] },
        { type: "paragraph", content: [{ type: "text", text: "line two" }] },
      ],
    });
  });
});
