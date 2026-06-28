import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { escapeCommentIdForSelector } from "@/text-editor-core/src/text-editor-comment-commands";
import type { DocsCommentThread } from "../docs-comments-types";
import { DocsCommentsThreadCard } from "./docs-comments-thread-card";
import { mergeDraftThreadWithOpenThreads } from "./docs-comments-utils";

import "./docs-comments-panel.css";

export type DocsCommentsPanelProps = {
  onCloseMobile: () => void;
  labels: DocsUILabels;
  threads: DocsCommentThread[];
  draftThread?: DocsCommentThread | null;
  currentUserId: string;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onAddReply: (threadId: string, body: string) => void;
  onToggleReaction: (threadId: string, emoji: string) => void;
  onResolveThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onCancelDraft?: () => void;
};

export function DocsCommentsPanel({
  onCloseMobile,
  labels,
  threads,
  draftThread = null,
  currentUserId,
  activeThreadId,
  onSelectThread,
  onAddReply,
  onToggleReaction,
  onResolveThread,
  onDeleteThread,
  onCancelDraft,
}: DocsCommentsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayThreads = useMemo(
    () => mergeDraftThreadWithOpenThreads(threads, draftThread),
    [draftThread, threads],
  );

  useEffect(() => {
    if (!activeThreadId || !scrollRef.current) return;
    const card = scrollRef.current.querySelector(
      `[data-thread-id="${escapeCommentIdForSelector(activeThreadId)}"]`,
    );
    card?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [activeThreadId]);

  return (
    <aside className="docs-comments-panel" aria-label={labels.commentsSidebarTitle}>
      <header className="docs-comments-panel__header">
        <div className="docs-comments-panel__header-main">
          <p className="docs-comments-panel__label">{labels.commentsSidebarTitle}</p>
          <p className="docs-comments-panel__count">
            {displayThreads.length === 1
              ? labels.commentsCountOne
              : labels.commentsCountMany(displayThreads.length)}
          </p>
        </div>
        <button
          type="button"
          className="docs-comments-panel__close"
          aria-label={labels.commentsCloseSidebar}
          onClick={onCloseMobile}
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div ref={scrollRef} className="docs-comments-panel__scroll">
        {displayThreads.length === 0 ? (
          <p className="docs-comments-panel__empty">{labels.commentsEmpty}</p>
        ) : (
          <div className="docs-comments-panel__threads">
            {displayThreads.map((thread) => {
              const isDraft = thread.messages.length === 0;
              return (
                <DocsCommentsThreadCard
                  key={thread.id}
                  thread={thread}
                  labels={labels}
                  currentUserId={currentUserId}
                  active={activeThreadId === thread.id}
                  onSelect={() => onSelectThread(thread.id)}
                  onAddReply={(body) => onAddReply(thread.id, body)}
                  onToggleReaction={(emoji) => onToggleReaction(thread.id, emoji)}
                  onResolve={() => onResolveThread(thread.id)}
                  onDelete={() => onDeleteThread(thread.id)}
                  onCancelDraft={isDraft ? onCancelDraft : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

/** @deprecated Use DocsCommentsPanel */
export type DocsCommentsSidebarProps = DocsCommentsPanelProps;

/** @deprecated Use DocsCommentsPanel */
export const DocsCommentsSidebar = DocsCommentsPanel;
