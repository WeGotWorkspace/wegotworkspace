import { useEffect, useRef } from "react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { escapeTrackChangeIdForSelector } from "@/text-editor-core/src/text-editor-track-changes";
import type { DocsSuggestionWithThread } from "../docs-suggestions-types";
import { DocsCollabSidebarPanel } from "../docs-collab-card";
import { DocsSuggestionCard } from "./docs-suggestion-card";
import "./docs-suggestions-panel.css";

export type DocsSuggestionsPanelProps = {
  onCloseMobile: () => void;
  labels: DocsUILabels;
  suggestions: DocsSuggestionWithThread[];
  currentUserId: string;
  activeChangeId: string | null;
  onSelectSuggestion: (changeId: string) => void;
  onAcceptSuggestion: (changeId: string) => void;
  onRejectSuggestion: (changeId: string) => void;
  onAddReply: (changeId: string, body: string) => void;
  onToggleReaction: (changeId: string, emoji: string) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
};

export function DocsSuggestionsPanel({
  onCloseMobile,
  labels,
  suggestions,
  currentUserId,
  activeChangeId,
  onSelectSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAddReply,
  onToggleReaction,
  onAcceptAll,
  onRejectAll,
}: DocsSuggestionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeChangeId || !scrollRef.current) return;
    const card = scrollRef.current.querySelector(
      `[data-change-id="${escapeTrackChangeIdForSelector(activeChangeId)}"]`,
    );
    card?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [activeChangeId]);

  const bulkActions =
    suggestions.length > 0 ? (
      <>
        {onAcceptAll ? (
          <button type="button" className="docs-suggestions-panel__bulk" onClick={onAcceptAll}>
            {labels.suggestionsAcceptAll}
          </button>
        ) : null}
        {onRejectAll ? (
          <button
            type="button"
            className="docs-suggestions-panel__bulk docs-suggestions-panel__bulk--muted"
            onClick={onRejectAll}
          >
            {labels.suggestionsRejectAll}
          </button>
        ) : null}
      </>
    ) : null;

  return (
    <DocsCollabSidebarPanel
      className="docs-suggestions-panel"
      ariaLabel={labels.suggestionsSidebarTitle}
      title={labels.suggestionsSidebarTitle}
      countLabel={
        suggestions.length === 1
          ? labels.suggestionsCountOne
          : labels.suggestionsCountMany(suggestions.length)
      }
      closeLabel={labels.suggestionsCloseSidebar}
      onClose={onCloseMobile}
      headerActions={bulkActions}
      scrollRef={scrollRef}
      empty={suggestions.length === 0}
      emptyLabel={labels.suggestionsEmpty}
      listClassName="docs-collab-sidebar-panel__list docs-suggestions-panel__list"
    >
      {suggestions.map((suggestion) => (
        <DocsSuggestionCard
          key={suggestion.changeId}
          suggestion={suggestion}
          labels={labels}
          currentUserId={currentUserId}
          active={activeChangeId === suggestion.changeId}
          onSelect={() => onSelectSuggestion(suggestion.changeId)}
          onAccept={() => onAcceptSuggestion(suggestion.changeId)}
          onReject={() => onRejectSuggestion(suggestion.changeId)}
          onAddReply={(body) => onAddReply(suggestion.changeId, body)}
          onToggleReaction={(emoji) => onToggleReaction(suggestion.changeId, emoji)}
        />
      ))}
    </DocsCollabSidebarPanel>
  );
}
