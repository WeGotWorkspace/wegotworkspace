import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import { Check, CheckCheck, Pencil, PenLine, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  editorHasTrackChanges,
  getTrackChangesMode,
  getTrackChangesPendingCount,
  trackChangeIdAtSelection,
} from "@/text-editor-core/src/text-editor-track-changes";

export type DocsCollabSuggestControlsProps = {
  editor: Editor | null;
  className?: string;
};

export function DocsCollabSuggestControls({ editor, className }: DocsCollabSuggestControlsProps) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setRevision((value) => value + 1);
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
    };
  }, [editor]);

  if (!editorHasTrackChanges(editor)) return null;

  const mode = getTrackChangesMode(editor);
  const pendingCount = getTrackChangesPendingCount(editor);
  const changeAtCursor = trackChangeIdAtSelection(editor);
  const suggestActive = mode === "suggest";

  return (
    <div
      className={cn("text-editor-suggest-controls", className)}
      role="toolbar"
      aria-label="Suggestion mode"
    >
      <button
        type="button"
        className={cn(
          "text-editor-suggest-controls__btn",
          !suggestActive && "text-editor-suggest-controls__btn--active",
        )}
        title="Edit mode — changes apply directly"
        aria-pressed={!suggestActive}
        onClick={() => editor.commands.setEditMode()}
      >
        <Pencil aria-hidden />
        <span className="text-editor-suggest-controls__label">Edit</span>
      </button>
      <button
        type="button"
        className={cn(
          "text-editor-suggest-controls__btn",
          suggestActive && "text-editor-suggest-controls__btn--active",
        )}
        title="Suggest mode — changes are tracked for review"
        aria-pressed={suggestActive}
        onClick={() => editor.commands.setSuggestMode()}
      >
        <PenLine aria-hidden />
        <span className="text-editor-suggest-controls__label">Suggest</span>
        {pendingCount > 0 ? (
          <span
            className="text-editor-suggest-controls__badge"
            aria-label={`${pendingCount} pending`}
          >
            {pendingCount}
          </span>
        ) : null}
      </button>

      <div className="text-editor-suggest-controls__sep" aria-hidden />

      <button
        type="button"
        className="text-editor-suggest-controls__btn"
        title="Accept suggestion at cursor"
        disabled={!changeAtCursor}
        onClick={() => {
          if (changeAtCursor) editor.commands.acceptChange(changeAtCursor);
        }}
      >
        <Check aria-hidden />
        <span className="text-editor-suggest-controls__label">Accept</span>
      </button>
      <button
        type="button"
        className="text-editor-suggest-controls__btn"
        title="Reject suggestion at cursor"
        disabled={!changeAtCursor}
        onClick={() => {
          if (changeAtCursor) editor.commands.rejectChange(changeAtCursor);
        }}
      >
        <X aria-hidden />
        <span className="text-editor-suggest-controls__label">Reject</span>
      </button>

      <div className="text-editor-suggest-controls__sep" aria-hidden />

      <button
        type="button"
        className="text-editor-suggest-controls__btn"
        title="Accept all suggestions"
        disabled={pendingCount === 0}
        onClick={() => editor.commands.acceptAll()}
      >
        <CheckCheck aria-hidden />
        <span className="text-editor-suggest-controls__label">Accept all</span>
      </button>
      <button
        type="button"
        className="text-editor-suggest-controls__btn"
        title="Reject all suggestions"
        disabled={pendingCount === 0}
        onClick={() => editor.commands.rejectAll()}
      >
        <XCircle aria-hidden />
        <span className="text-editor-suggest-controls__label">Reject all</span>
      </button>
    </div>
  );
}
