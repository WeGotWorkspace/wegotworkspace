import { useRef } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { MarkdownEditorSlashMenu } from "@/markdown-editor-core/src/markdown-editor-slash-menu";
import { MarkdownEditorTableControls } from "@/markdown-editor-core/src/markdown-editor-table-controls";

export type MarkdownEditorSheetProps = {
  editor: Editor | null;
  className?: string;
};

/**
 * Letter-sized sheet with inline ProseMirror editing, slash menu, and table controls.
 */
export function MarkdownEditorSheet({ editor, className }: MarkdownEditorSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("markdown-editor-sheet", className)}>
      <div className="markdown-editor-scroll relative flex-1 overflow-y-auto">
        <div className="markdown-editor-sheet__viewport">
          <div className="markdown-editor-sheet__stack">
            <div ref={contentRef} className="markdown-editor-sheet__content">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
        <MarkdownEditorSlashMenu editor={editor} />
      </div>
      <MarkdownEditorTableControls editor={editor} />
    </div>
  );
}
