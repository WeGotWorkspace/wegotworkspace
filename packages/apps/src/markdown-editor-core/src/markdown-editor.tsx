import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { MARKDOWN_EDITOR_DEMO_HTML } from "@/markdown-editor-core/src/markdown-editor-fixtures";
import { MarkdownEditorFormatBar } from "@/markdown-editor-core/src/markdown-editor-format-bar";
import { MarkdownEditorSheet } from "@/markdown-editor-core/src/markdown-editor-sheet";
import { useMarkdownEditor } from "@/markdown-editor-core/src/use-markdown-editor";

import "@/markdown-editor-core/src/markdown-editor.css";

export type MarkdownEditorProps = {
  /** Initial HTML content for the editor. */
  content?: string;
  editable?: boolean;
  placeholder?: string;
  showPrint?: boolean;
  className?: string;
  onUpdate?: (editor: Editor) => void;
};

/**
 * Full markdown editing experience: formatting toolbar plus letter sheet with slash commands.
 */
export function MarkdownEditor({
  content = MARKDOWN_EDITOR_DEMO_HTML,
  editable = true,
  placeholder,
  showPrint = true,
  className,
  onUpdate,
}: MarkdownEditorProps) {
  const editor = useMarkdownEditor({
    content,
    editable,
    placeholder,
    onUpdate,
  });

  return (
    <div className={cn("markdown-editor flex h-full w-full flex-col", className)}>
      <MarkdownEditorFormatBar editor={editor} showPrint={showPrint} />
      <div className="flex min-h-0 flex-1">
        <MarkdownEditorSheet editor={editor} className="flex-1" />
      </div>
    </div>
  );
}

export type { Editor };
