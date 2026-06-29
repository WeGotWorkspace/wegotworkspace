import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import { ChevronDown, Pencil, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import {
  editorHasTrackChanges,
  getTrackChangesMode,
  getTrackChangesPendingCount,
} from "@/text-editor-core/src/text-editor-track-changes";

export type DocsCollabSuggestControlsProps = {
  editor: Editor | null;
  className?: string;
};

/** Edit/suggest mode dropdown for the format bar (accept/reject live in the suggestions sidebar). */
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
  const suggestActive = mode === "suggest";
  const triggerLabel = suggestActive ? "Suggest" : "Edit";
  const TriggerIcon = suggestActive ? PenLine : Pencil;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Editing mode"
          aria-haspopup="menu"
          aria-label={`Editing mode: ${triggerLabel}`}
          className={cn("text-editor-format-bar__mode-trigger", className)}
        >
          <TriggerIcon className="text-editor-format-bar__mode-trigger-icon" aria-hidden />
          <span className="text-editor-format-bar__mode-trigger-label">{triggerLabel}</span>
          {pendingCount > 0 ? (
            <span
              className="text-editor-format-bar__mode-trigger-badge"
              aria-label={`${pendingCount} pending suggestions`}
            >
              {pendingCount}
            </span>
          ) : null}
          <ChevronDown className="text-editor-format-bar__mode-trigger-chevron" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-editor-format-bar__mode-menu">
        <DropdownMenuItem
          onClick={() => editor.commands.setEditMode()}
          className={cn(
            "text-editor-format-bar__mode-option",
            !suggestActive && "text-editor-format-bar__mode-option--selected",
          )}
        >
          <Pencil className="text-editor-format-bar__mode-option-icon" aria-hidden />
          <span className="text-editor-format-bar__mode-option-label">Edit</span>
          <span className="text-editor-format-bar__mode-option-hint">Changes apply directly</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.commands.setSuggestMode()}
          className={cn(
            "text-editor-format-bar__mode-option",
            suggestActive && "text-editor-format-bar__mode-option--selected",
          )}
        >
          <PenLine className="text-editor-format-bar__mode-option-icon" aria-hidden />
          <span className="text-editor-format-bar__mode-option-label">Suggest</span>
          {pendingCount > 0 ? (
            <span
              className="text-editor-format-bar__mode-option-badge"
              aria-label={`${pendingCount} pending`}
            >
              {pendingCount}
            </span>
          ) : null}
          <span className="text-editor-format-bar__mode-option-hint">
            Changes are tracked for review
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
