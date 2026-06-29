import { MessageSquare } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { cn } from "@/lib/utils";

export type DocsCollabCommentControlProps = {
  labels: Pick<
    DocsUILabels,
    | "commentsAddFromSelection"
    | "commentsAddFromSelectionDisabledNoSelection"
    | "commentsAddFromSelectionDisabledViewSource"
  >;
  canAddFromSelection: boolean;
  commentsDisabled?: boolean;
  onAddCommentFromSelection: () => void;
  className?: string;
};

/** Format-bar control to start a comment on the current editor selection. */
export function DocsCollabCommentControl({
  labels,
  canAddFromSelection,
  commentsDisabled = false,
  onAddCommentFromSelection,
  className,
}: DocsCollabCommentControlProps) {
  const disabled = commentsDisabled || !canAddFromSelection;
  const title = commentsDisabled
    ? labels.commentsAddFromSelectionDisabledViewSource
    : !canAddFromSelection
      ? labels.commentsAddFromSelectionDisabledNoSelection
      : labels.commentsAddFromSelection;

  return (
    <button
      type="button"
      title={title}
      aria-label={labels.commentsAddFromSelection}
      disabled={disabled}
      onClick={onAddCommentFromSelection}
      className={cn("text-editor-format-bar__btn text-editor-format-bar__mode-trigger", className)}
    >
      <MessageSquare className="text-editor-format-bar__mode-trigger-icon" aria-hidden />
      <span className="text-editor-format-bar__mode-trigger-label">
        {labels.commentsAddFromSelection}
      </span>
    </button>
  );
}
