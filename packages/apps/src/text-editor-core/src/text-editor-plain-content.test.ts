import { describe, expect, it } from "vitest";
import {
  normalizePlainTextLines,
  plainTextToTiptapContent,
} from "@/text-editor-core/src/text-editor-plain-content";
import { plainTextToFragment } from "@/text-editor-core/src/text-editor-plain-content";
import { Schema } from "@tiptap/pm/model";

describe("normalizePlainTextLines", () => {
  it("normalizes CRLF", () => {
    expect(normalizePlainTextLines("a\r\nb")).toEqual(["a", "b"]);
  });
});

describe("plainTextToFragment", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "inline*", group: "block" },
      text: { group: "inline" },
    },
  });

  it("builds one paragraph per line", () => {
    const fragment = plainTextToFragment("one\ntwo", schema);
    expect(fragment?.childCount).toBe(2);
    expect(fragment?.child(0).textContent).toBe("one");
    expect(fragment?.child(1).textContent).toBe("two");
  });
});

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
