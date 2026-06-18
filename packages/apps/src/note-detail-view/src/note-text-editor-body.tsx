import { cn } from "@/lib/utils";
import { TextEditorSheet } from "@/text-editor-core/src/text-editor-sheet";
import { useTextEditor } from "@/text-editor-core/src/use-text-editor";

import "@/text-editor-core/src/text-editor.css";
import "@/note-detail-view/src/note-text-editor-body.css";

export type NoteTextEditorBodyProps = {
  /** Remount editor when the active note changes. */
  noteId: string;
  /** Remount when remote content revision changes (e.g. note edited date). */
  contentRevision?: string;
  initialMarkdown: string;
  readOnly?: boolean;
  onMarkdownChange?: (markdown: string) => void;
  className?: string;
};

function NoteTextEditorBodyInner({
  initialMarkdown,
  readOnly = false,
  onMarkdownChange,
  className,
}: Omit<NoteTextEditorBodyProps, "noteId">) {
  const canEdit = !readOnly && Boolean(onMarkdownChange);

  const editor = useTextEditor({
    format: "markdown",
    content: initialMarkdown,
    editable: canEdit,
    placeholder: "Press '/' for commands…",
    onUpdate: canEdit
      ? ({ content }) => {
          onMarkdownChange?.(content);
        }
      : undefined,
  });

  return (
    <div className={cn("note-text-editor-body text-editor", className)}>
      <TextEditorSheet editor={editor} variant="sheet" />
    </div>
  );
}

/**
 * Markdown note body using the shared TextEditor (no format bar).
 */
export function NoteTextEditorBody({
  noteId,
  contentRevision = "",
  ...props
}: NoteTextEditorBodyProps) {
  return <NoteTextEditorBodyInner key={`${noteId}:${contentRevision}`} {...props} />;
}
