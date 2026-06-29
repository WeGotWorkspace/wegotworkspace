import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { escapeCommentIdForSelector } from "@/text-editor-core/src/text-editor-comment-commands";
import { escapeTrackChangeIdForSelector } from "@/text-editor-core/src/text-editor-track-changes";
import type { DocsCommentThread } from "../docs-comments-types";
import { DocsCommentsThreadCard } from "../docs-comments/docs-comments-thread-card";
import { mergeDraftThreadWithOpenThreads } from "../docs-comments/docs-comments-utils";
import {
  observeCommentMarkVisibility,
  resolveCommentVisibilityModeAsync,
  sortThreadsByDocumentOrder,
  syncCommentMarkVisibility,
  syncCommentViewTimelineStyles,
  type DocsCommentVisibilityMode,
} from "../docs-comments/docs-comments-mark-visibility";
import { useDocsCollabFloatingLayerLayout } from "../docs-collab-card";
import type { DocsSuggestionWithThread } from "../docs-suggestions-types";
import { DocsSuggestionCard } from "../docs-suggestions/docs-suggestion-card";
import "./docs-collab-review-floating-layer.css";

export type DocsCollabReviewFloatingLayerProps = {
  editor: Editor | null;
  visible: boolean;
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
};

const SCROLL_ANCHOR_VIEWPORT_OFFSET_FRACTION = 1 / 3;

function sortSuggestionsByDocumentOrder(
  suggestions: DocsSuggestionWithThread[],
): DocsSuggestionWithThread[] {
  return [...suggestions].sort((a, b) => a.from - b.from);
}

export function DocsCollabReviewFloatingLayer({
  editor,
  visible,
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
}: DocsCollabReviewFloatingLayerProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const suggestionCardRefs = useRef(new Map<string, HTMLDivElement>());
  const [visibilityMode, setVisibilityMode] = useState<DocsCommentVisibilityMode>("static");
  const showLayer = visible || draftThread != null;
  const { layerRef, containerLayout } = useDocsCollabFloatingLayerLayout({
    editor,
    visible: showLayer,
  });

  const registerCardRef = useCallback((threadId: string, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current.set(threadId, node);
      return;
    }
    cardRefs.current.delete(threadId);
  }, []);

  const registerSuggestionCardRef = useCallback((changeId: string, node: HTMLDivElement | null) => {
    if (node) {
      suggestionCardRefs.current.set(changeId, node);
      return;
    }
    suggestionCardRefs.current.delete(changeId);
  }, []);

  const displayThreads = useMemo(
    () => mergeDraftThreadWithOpenThreads(threads, draftThread),
    [draftThread, threads],
  );

  const orderedThreads = useMemo(() => {
    if (!editor) return displayThreads;
    return sortThreadsByDocumentOrder(editor, displayThreads);
  }, [displayThreads, editor]);

  const orderedSuggestions = useMemo(
    () => sortSuggestionsByDocumentOrder(suggestions),
    [suggestions],
  );

  const markedThreadIds = useMemo(
    () => orderedThreads.filter((thread) => thread.messages.length > 0).map((thread) => thread.id),
    [orderedThreads],
  );

  const markedChangeIds = useMemo(
    () => orderedSuggestions.map((suggestion) => suggestion.changeId),
    [orderedSuggestions],
  );

  const getCollabCardElement = useCallback((markId: string) => {
    return cardRefs.current.get(markId) ?? suggestionCardRefs.current.get(markId);
  }, []);

  useEffect(() => {
    if (!editor || !showLayer) return;

    const syncTimelines = () => {
      syncCommentViewTimelineStyles(editor, markedThreadIds, markedChangeIds);
    };

    syncTimelines();
    editor.on("transaction", syncTimelines);
    editor.on("update", syncTimelines);

    return () => {
      editor.off("transaction", syncTimelines);
      editor.off("update", syncTimelines);
      syncCommentViewTimelineStyles(editor, [], []);
    };
  }, [editor, markedChangeIds, markedThreadIds, showLayer]);

  useEffect(() => {
    if (!editor || !showLayer) return;

    let cancelled = false;
    void resolveCommentVisibilityModeAsync().then((mode) => {
      if (!cancelled) setVisibilityMode(mode);
    });

    return () => {
      cancelled = true;
    };
  }, [editor, markedChangeIds, markedThreadIds, showLayer]);

  useEffect(() => {
    if (!editor || !showLayer || visibilityMode !== "observer") return;

    const visibilityObserver = observeCommentMarkVisibility(
      editor,
      getCollabCardElement,
      markedThreadIds,
      markedChangeIds,
    );
    const resyncVisibility = () => visibilityObserver.resync();

    resyncVisibility();
    editor.on("transaction", resyncVisibility);
    editor.on("update", resyncVisibility);

    return () => {
      editor.off("transaction", resyncVisibility);
      editor.off("update", resyncVisibility);
      visibilityObserver.disconnect();
    };
  }, [editor, getCollabCardElement, markedChangeIds, markedThreadIds, showLayer, visibilityMode]);

  useEffect(() => {
    if (!editor || !showLayer || visibilityMode !== "static") return;

    const syncVisibility = () =>
      syncCommentMarkVisibility(editor, getCollabCardElement, markedThreadIds, markedChangeIds);

    syncVisibility();
    editor.on("transaction", syncVisibility);
    editor.on("update", syncVisibility);

    const scrollport = editor.view.dom.closest(".text-editor-sheet--fill");
    scrollport?.addEventListener("scroll", syncVisibility, { passive: true });

    return () => {
      editor.off("transaction", syncVisibility);
      editor.off("update", syncVisibility);
      scrollport?.removeEventListener("scroll", syncVisibility);
    };
  }, [editor, getCollabCardElement, markedChangeIds, markedThreadIds, showLayer, visibilityMode]);

  useEffect(() => {
    if (!showLayer || !editor) return;

    if (activeChangeId) {
      const mark = editor.view.dom.querySelector(
        `[data-change-id="${escapeTrackChangeIdForSelector(activeChangeId)}"]`,
      );
      if (mark) {
        mark.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }

      const suggestion = orderedSuggestions.find((item) => item.changeId === activeChangeId);
      if (suggestion) {
        try {
          const coords = editor.view.coordsAtPos(suggestion.from);
          const scrollContainer = editor.view.dom.closest(
            ".text-editor-sheet__surface",
          ) as HTMLElement | null;
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const targetScrollTop =
              coords.top -
              containerRect.top +
              scrollContainer.scrollTop -
              containerRect.height * SCROLL_ANCHOR_VIEWPORT_OFFSET_FRACTION;
            scrollContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
          }
        } catch {
          // Anchor position no longer valid.
        }
      }
      return;
    }

    if (!activeThreadId) return;

    const mark = editor.view.dom.querySelector(
      `[data-comment-id="${escapeCommentIdForSelector(activeThreadId)}"]`,
    );
    if (mark) {
      mark.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    const thread = orderedThreads.find((item) => item.id === activeThreadId);
    if (thread && typeof thread.anchorFrom === "number") {
      try {
        const coords = editor.view.coordsAtPos(thread.anchorFrom);
        const scrollContainer = editor.view.dom.closest(
          ".text-editor-sheet__surface",
        ) as HTMLElement | null;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const targetScrollTop =
            coords.top -
            containerRect.top +
            scrollContainer.scrollTop -
            containerRect.height * SCROLL_ANCHOR_VIEWPORT_OFFSET_FRACTION;
          scrollContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
        }
      } catch {
        // Anchor position no longer valid.
      }
    }
  }, [activeChangeId, activeThreadId, editor, orderedSuggestions, orderedThreads, showLayer]);

  const hasContent = orderedSuggestions.length > 0 || orderedThreads.length > 0;

  if (!editor || !showLayer || !hasContent || containerLayout == null) return null;

  const cardMaxHeight = Math.min(384, Math.max(containerLayout.maxHeight - 16, 120));

  return (
    <div
      ref={layerRef}
      className="docs-collab-review-floating-layer"
      data-visible="true"
      data-visibility-mode={visibilityMode}
      aria-label={labels.reviewSidebarTitle}
      style={{
        top: `${containerLayout.top}px`,
        left: `${containerLayout.left}px`,
        maxHeight: `${containerLayout.maxHeight}px`,
      }}
    >
      {orderedSuggestions.length > 0 ? (
        <div className="docs-collab-review-floating-layer__section docs-collab-review-floating-layer__section--suggestions">
          <div className="docs-collab-review-floating-layer__stack">
            {orderedSuggestions.map((suggestion) => {
              const isActive = activeChangeId === suggestion.changeId;

              return (
                <div
                  key={suggestion.changeId}
                  ref={(node) => registerSuggestionCardRef(suggestion.changeId, node)}
                  className="docs-collab-review-floating-layer__card docs-collab-review-floating-layer__card--suggestion"
                  data-change-id={suggestion.changeId}
                  data-active={isActive ? "true" : "false"}
                  style={{
                    ["--docs-suggestion-card-max-height" as string]: `${cardMaxHeight}px`,
                  }}
                >
                  <DocsSuggestionCard
                    suggestion={suggestion}
                    labels={labels}
                    currentUserId={currentUserId}
                    active={isActive}
                    onSelect={() => onSelectSuggestion(suggestion.changeId)}
                    onAccept={() => onAcceptSuggestion(suggestion.changeId)}
                    onReject={() => onRejectSuggestion(suggestion.changeId)}
                    onAddReply={(body) => onAddSuggestionReply(suggestion.changeId, body)}
                    onToggleReaction={(emoji) =>
                      onToggleSuggestionReaction(suggestion.changeId, emoji)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {orderedThreads.length > 0 ? (
        <div className="docs-collab-review-floating-layer__section docs-collab-review-floating-layer__section--comments">
          <div className="docs-collab-review-floating-layer__stack">
            {orderedThreads.map((thread) => {
              const isDraft = thread.messages.length === 0;
              const isActive = activeThreadId === thread.id;

              return (
                <div
                  key={thread.id}
                  ref={(node) => registerCardRef(thread.id, node)}
                  className="docs-collab-review-floating-layer__card docs-collab-review-floating-layer__card--comment"
                  data-thread-id={thread.id}
                  data-draft={isDraft ? "true" : "false"}
                  data-in-view={isDraft ? "true" : undefined}
                  data-active={isActive ? "true" : "false"}
                  style={{
                    ["--docs-comments-thread-card-max-height" as string]: `${cardMaxHeight}px`,
                  }}
                >
                  <DocsCommentsThreadCard
                    thread={thread}
                    labels={labels}
                    currentUserId={currentUserId}
                    active={isActive}
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
        </div>
      ) : null}
    </div>
  );
}
