import type { Editor } from "@tiptap/react";

export const TEXT_EDITOR_CONTENT_FORMATS = ["html", "markdown"] as const;
export type TextEditorContentFormat = (typeof TEXT_EDITOR_CONTENT_FORMATS)[number];

type TextEditorMarkdownStorage = {
  markdown?: {
    getMarkdown: () => string;
  };
};

/** Read editor document in the configured serialization format. */
export function getTextEditorContent(editor: Editor, format: TextEditorContentFormat): string {
  if (format === "markdown") {
    const markdown = (editor.storage as TextEditorMarkdownStorage).markdown?.getMarkdown();
    if (markdown != null) return markdown;
  }
  return editor.getHTML();
}

/** Replace the full document from HTML or Markdown. */
export function setTextEditorContent(editor: Editor, content: string): void {
  editor.commands.setContent(content, { emitUpdate: false });
}
