import { useEffect, useMemo, useRef } from "react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { escapeCommentIdForSelector } from "@/text-editor-core/src/text-editor-comment-commands";
import { escapeTrackChangeIdForSelector } from "@/text-editor-core/src/text-editor-track-changes";
import type { DocsCommentThread } from "../docs-comments-types";
import { DocsCommentsThreadCard } from "../docs-comments/docs-comments-thread-card";
import { mergeDraftThreadWithOpenThreads } from "../docs-comments/docs-comments-utils";
import { DocsCollabSidebarPanel } from "../docs-collab-card";
import type { DocsSuggestionWithThread } from "../docs-suggestions-types";
import { DocsSuggestionCard } from "../docs-suggestions/docs-suggestion-card";
import "./docs-collab-review-panel.css";

export type DocsCollabReviewPanelProps = {
  onCloseMobile: () => void;
  labels: DocsUILabels;
  threads: DocsCommentThread[];
  draftThread?: DocsCommentThread | null;
  suggestions: DocsSuggestionWithThread[];
  currentUserId: string;
  activeThreadId: string | null;
  activeChangeId: string | null;
  onSelectThread: (threadId: string) => void;
  onAddReply: (threadId: string, body: string) => void;
  onToggleReaction: (threadId: string, emoji: string) => void;
  onResolveThread: (threadId: string) => void;
  onCancelDraft?: () => void;
  onSelectSuggestion: (changeId: string) => void;
  onAcceptSuggestion: (changeId: string) => void;
  onRejectSuggestion: (changeId: string) => void;
  onAddSuggestionReply: (changeId: string, body: string) => void;
  onToggleSuggestionReaction: (changeId: string, emoji: string) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
};

export function DocsCollabReviewPanel({
  onCloseMobile,
  labels,
  threads,
  draftThread = null,
  suggestions,
  currentUserId,
  activeThreadId,
  activeChangeId,
  onSelectThread,
  onAddReply,
  onToggleReaction,
  onResolveThread,
  onCancelDraft,
  onSelectSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAddSuggestionReply,
  onToggleSuggestionReaction,
  onAcceptAll,
  onRejectAll,
}: DocsCollabReviewPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayThreads = useMemo(
    () => mergeDraftThreadWithOpenThreads(threads, draftThread),
    [draftThread, threads],
  );

  const itemCount = displayThreads.length + suggestions.length;
  const isEmpty = itemCount === 0;

  const countLabel = itemCount === 1 ? labels.reviewCountOne : labels.reviewCountMany(itemCount);

  const bulkActions =
    suggestions.length > 0 ? (
      <>
        {onAcceptAll ? (
          <button type="button" className="docs-collab-review-panel__bulk" onClick={onAcceptAll}>
            {labels.suggestionsAcceptAll}
          </button>
        ) : null}
        {onRejectAll ? (
          <button
            type="button"
            className="docs-collab-review-panel__bulk docs-collab-review-panel__bulk--muted"
            onClick={onRejectAll}
          >
            {labels.suggestionsRejectAll}
          </button>
        ) : null}
      </>
    ) : null;

  useEffect(() => {
    if (!scrollRef.current) return;
    if (activeChangeId) {
      const card = scrollRef.current.querySelector(
        `[data-change-id="${escapeTrackChangeIdForSelector(activeChangeId)}"]`,
      );
      card?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (!activeThreadId) return;
    const card = scrollRef.current.querySelector(
      `[data-thread-id="${escapeCommentIdForSelector(activeThreadId)}"]`,
    );
    card?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [activeChangeId, activeThreadId]);

  return (
    <DocsCollabSidebarPanel
      className="docs-collab-review-panel"
      ariaLabel={labels.reviewSidebarTitle}
      title={labels.reviewSidebarTitle}
      countLabel={countLabel}
      closeLabel={labels.reviewCloseSidebar}
      onClose={onCloseMobile}
      headerActions={bulkActions}
      scrollRef={scrollRef}
      empty={isEmpty}
      emptyLabel={labels.reviewEmpty}
      listClassName="docs-collab-review-panel__list"
    >
      {suggestions.length > 0 ? (
        <section
          className="docs-collab-review-panel__section"
          aria-label={labels.suggestionsSidebarTitle}
        >
          <h3 className="docs-collab-review-panel__section-title">
            {labels.suggestionsSidebarTitle}
          </h3>
          <div className="docs-collab-review-panel__section-list">
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
                onAddReply={(body) => onAddSuggestionReply(suggestion.changeId, body)}
                onToggleReaction={(emoji) => onToggleSuggestionReaction(suggestion.changeId, emoji)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {displayThreads.length > 0 ? (
        <section
          className="docs-collab-review-panel__section"
          aria-label={labels.commentsSidebarTitle}
        >
          <h3 className="docs-collab-review-panel__section-title">{labels.commentsSidebarTitle}</h3>
          <div className="docs-collab-review-panel__section-list">
            {displayThreads.map((thread) => {
              const isDraft = thread.messages.length === 0;
              return (
                <div key={thread.id} data-thread-id={thread.id}>
                  <DocsCommentsThreadCard
                    thread={thread}
                    labels={labels}
                    currentUserId={currentUserId}
                    active={activeThreadId === thread.id}
                    onSelect={() => onSelectThread(thread.id)}
                    onAddReply={(body) => onAddReply(thread.id, body)}
                    onToggleReaction={(emoji) => onToggleReaction(thread.id, emoji)}
                    onResolve={() => onResolveThread(thread.id)}
                    onCancelDraft={isDraft ? onCancelDraft : undefined}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </DocsCollabSidebarPanel>
  );
}
