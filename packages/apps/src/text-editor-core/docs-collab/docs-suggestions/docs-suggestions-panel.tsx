import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import { escapeTrackChangeIdForSelector } from "@/text-editor-core/src/text-editor-track-changes";
import { DocsSuggestionCard } from "./docs-suggestion-card";
import "./docs-suggestions-panel.css";

export type DocsSuggestionsPanelProps = {
  onCloseMobile: () => void;
  labels: DocsUILabels;
  suggestions: DocsTrackChangeGroup[];
  activeChangeId: string | null;
  onSelectSuggestion: (changeId: string) => void;
  onAcceptSuggestion: (changeId: string) => void;
  onRejectSuggestion: (changeId: string) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
};

export function DocsSuggestionsPanel({
  onCloseMobile,
  labels,
  suggestions,
  activeChangeId,
  onSelectSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
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

  return (
    <aside className="docs-suggestions-panel" aria-label={labels.suggestionsSidebarTitle}>
      <header className="docs-suggestions-panel__header">
        <div className="docs-suggestions-panel__header-main">
          <p className="docs-suggestions-panel__label">{labels.suggestionsSidebarTitle}</p>
          <p className="docs-suggestions-panel__count">
            {suggestions.length === 1
              ? labels.suggestionsCountOne
              : labels.suggestionsCountMany(suggestions.length)}
          </p>
        </div>
        <div className="docs-suggestions-panel__header-actions">
          {suggestions.length > 0 && onAcceptAll ? (
            <button type="button" className="docs-suggestions-panel__bulk" onClick={onAcceptAll}>
              {labels.suggestionsAcceptAll}
            </button>
          ) : null}
          {suggestions.length > 0 && onRejectAll ? (
            <button
              type="button"
              className="docs-suggestions-panel__bulk docs-suggestions-panel__bulk--muted"
              onClick={onRejectAll}
            >
              {labels.suggestionsRejectAll}
            </button>
          ) : null}
          <button
            type="button"
            className="docs-suggestions-panel__close"
            aria-label={labels.suggestionsCloseSidebar}
            onClick={onCloseMobile}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="docs-suggestions-panel__scroll">
        {suggestions.length === 0 ? (
          <p className="docs-suggestions-panel__empty">{labels.suggestionsEmpty}</p>
        ) : (
          <div className="docs-suggestions-panel__list">
            {suggestions.map((suggestion) => (
              <DocsSuggestionCard
                key={suggestion.changeId}
                suggestion={suggestion}
                labels={labels}
                active={activeChangeId === suggestion.changeId}
                onSelect={() => onSelectSuggestion(suggestion.changeId)}
                onAccept={() => onAcceptSuggestion(suggestion.changeId)}
                onReject={() => onRejectSuggestion(suggestion.changeId)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
