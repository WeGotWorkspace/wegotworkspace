import type { Editor } from "@tiptap/react";
import { Fragment, type Schema } from "@tiptap/pm/model";

export function normalizePlainTextLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

/** Build a minimal TipTap document that mirrors plain text line breaks. */
export function plainTextToTiptapContent(text: string) {
  const lines = normalizePlainTextLines(text);
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

/** ProseMirror fragment for paste: one paragraph per line, no marks. */
export function plainTextToFragment(text: string, schema: Schema): Fragment | null {
  const paragraph = schema.nodes.paragraph;
  if (!paragraph) return null;

  const lines = normalizePlainTextLines(text);
  const nodes = lines.map((line) => paragraph.create(null, line ? schema.text(line) : undefined));
  return Fragment.from(nodes);
}

export function plainTextFromEditor(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" });
}
