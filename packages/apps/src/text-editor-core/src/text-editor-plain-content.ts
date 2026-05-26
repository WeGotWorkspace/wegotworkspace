import type { Editor } from "@tiptap/react";

/** Build a minimal TipTap document that mirrors plain text line breaks. */
export function plainTextToTiptapContent(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function plainTextFromEditor(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" });
}
