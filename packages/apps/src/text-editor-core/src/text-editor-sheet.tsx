import { EditorContent, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { TextEditorSlashMenu } from "@/text-editor-core/src/text-editor-slash-menu";
import { TextEditorTableControls } from "@/text-editor-core/src/text-editor-table-controls";

export type TextEditorSheetVariant = "sheet" | "inline";

export type TextEditorSheetProps = {
  editor: Editor | null;
  /** `sheet` = letter layout; `inline` = flush body without page chrome (e.g. notes). */
  variant?: TextEditorSheetVariant;
  /** Grow the sheet to fill a flex parent (e.g. mail compose). Shadow and radius stay on the surface. */
  fill?: boolean;
  className?: string;
};

/**
 * Letter-sized sheet with inline ProseMirror editing, slash menu, and table controls.
 */
export function TextEditorSheet({
  editor,
  variant = "sheet",
  fill = false,
  className,
}: TextEditorSheetProps) {
  return (
    <div
      className={cn(
        "text-editor-sheet",
        variant === "inline" && "text-editor-sheet--inline",
        fill && variant === "sheet" && "text-editor-sheet--fill",
        className,
      )}
    >
      <EditorContent
        editor={editor}
        className={variant === "sheet" ? "text-editor-sheet__surface" : undefined}
      />
      <TextEditorSlashMenu editor={editor} />
      <TextEditorTableControls editor={editor} />
    </div>
  );
}
