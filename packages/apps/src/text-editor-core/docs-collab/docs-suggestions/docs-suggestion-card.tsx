import { Check, X } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import {
  DocsCollabCardHeader,
  DocsCollabCardShell,
  useDocsCollabCardExit,
} from "../docs-collab-card";
import { SuggestionDiffBody } from "./docs-suggestions-utils";
import "./docs-suggestion-card.css";

export type DocsSuggestionCardProps = {
  suggestion: DocsTrackChangeGroup;
  labels: DocsUILabels;
  active: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
};

const SUGGESTION_EXIT_ANIMATION = "docs-suggestion-card-evaporate";

export function DocsSuggestionCard({
  suggestion,
  labels,
  active,
  onSelect,
  onAccept,
  onReject,
}: DocsSuggestionCardProps) {
  const { cardRef, isExiting, runExitAnimation, handleExitAnimationEnd } = useDocsCollabCardExit({
    exitAnimationName: SUGGESTION_EXIT_ANIMATION,
  });

  return (
    <DocsCollabCardShell
      cardRef={cardRef}
      className="docs-suggestion-card"
      exitVariant="suggestion"
      active={active}
      isExiting={isExiting}
      onSelect={onSelect}
      onAnimationEnd={handleExitAnimationEnd}
      dataAttributes={{ "data-change-id": suggestion.changeId }}
    >
      <DocsCollabCardHeader
        authorName={suggestion.authorName}
        createdAt={suggestion.timestamp}
        actions={
          <>
            <button
              type="button"
              className="docs-suggestion-card__accept"
              aria-label={labels.suggestionsAccept}
              onClick={(event) => {
                event.stopPropagation();
                runExitAnimation(onAccept);
              }}
            >
              <Check className="docs-suggestion-card__accept-icon" aria-hidden />
              Accept
            </button>
            <button
              type="button"
              className="docs-suggestion-card__reject"
              aria-label={labels.suggestionsReject}
              onClick={(event) => {
                event.stopPropagation();
                runExitAnimation(onReject);
              }}
            >
              <X className="docs-suggestion-card__reject-icon" aria-hidden />
            </button>
          </>
        }
      />

      <SuggestionDiffBody parts={suggestion.parts} ariaLabel={suggestion.summary} />
    </DocsCollabCardShell>
  );
}
