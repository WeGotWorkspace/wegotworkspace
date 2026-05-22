import { useRef } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { TextEditorSlashMenu } from "@/text-editor-core/src/text-editor-slash-menu";
import { TextEditorTableControls } from "@/text-editor-core/src/text-editor-table-controls";

export type TextEditorSheetProps = {
  editor: Editor | null;
  className?: string;
};

/**
 * Letter-sized sheet with inline ProseMirror editing, slash menu, and table controls.
 */
export function TextEditorSheet({ editor, className }: TextEditorSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("text-editor-sheet", className)}>
      <div className="text-editor-scroll">
        <div className="text-editor-sheet__stack">
          <div ref={contentRef} className="text-editor-sheet__content">
            <EditorContent editor={editor} />
          </div>
        </div>
        <TextEditorSlashMenu editor={editor} />
      </div>
      <TextEditorTableControls editor={editor} />
    </div>
  );
}
