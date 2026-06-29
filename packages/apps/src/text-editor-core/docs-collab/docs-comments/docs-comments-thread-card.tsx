import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Smile, Trash2 } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { DOCS_COMMENT_REACTION_EMOJIS, type DocsCommentThread } from "../docs-comments-types";
import {
  DocsCollabCardHeader,
  DocsCollabCardShell,
  DocsCollabMessageReply,
  useDocsCollabCardExit,
} from "../docs-collab-card";
import "./docs-comments-thread-card.css";

export type DocsCommentsThreadCardProps = {
  thread: DocsCommentThread;
  labels: DocsUILabels;
  currentUserId: string;
  active: boolean;
  onSelect: () => void;
  onAddReply: (body: string) => void;
  onToggleReaction: (emoji: string) => void;
  onResolve: () => void;
  onDelete: () => void;
  onCancelDraft?: () => void;
};

function reactionCount(reactions: DocsCommentThread["reactions"], emoji: string): number {
  return reactions?.find((reaction) => reaction.emoji === emoji)?.userIds.length ?? 0;
}

function userReacted(
  reactions: DocsCommentThread["reactions"],
  emoji: string,
  userId: string,
): boolean {
  return (
    reactions?.some((reaction) => reaction.emoji === emoji && reaction.userIds.includes(userId)) ??
    false
  );
}

const COMMENT_EXIT_ANIMATION = "docs-comments-thread-card-evaporate";

export function DocsCommentsThreadCard({
  thread,
  labels,
  currentUserId,
  active,
  onSelect,
  onAddReply,
  onToggleReaction,
  onResolve,
  onDelete,
  onCancelDraft,
}: DocsCommentsThreadCardProps) {
  const [composerText, setComposerText] = useState("");
  const composerRef = useRef<HTMLInputElement>(null);
  const { cardRef, isExiting, runExitAnimation, handleExitAnimationEnd } = useDocsCollabCardExit({
    exitAnimationName: COMMENT_EXIT_ANIMATION,
  });
  const isDraft = thread.messages.length === 0;
  const firstMessage = thread.messages[0];
  const replies = thread.messages.slice(1);
  const trimmedComposerText = composerText.trim();
  const canPost = trimmedComposerText.length > 0;

  const visibleReactions = useMemo(
    () =>
      thread.reactions
        ?.filter((reaction) => reaction.userIds.length > 0)
        .map((reaction) => reaction.emoji) ?? [],
    [thread.reactions],
  );

  useEffect(() => {
    if (!active) return;
    composerRef.current?.focus();
  }, [active, thread.id]);

  useEffect(() => {
    setComposerText("");
  }, [isDraft, thread.id]);

  const submitComposer = () => {
    if (!canPost) return;
    onAddReply(trimmedComposerText);
    setComposerText("");
  };

  if (!isDraft && !firstMessage) return null;

  const authorName = firstMessage?.author.name ?? thread.createdBy.name;
  const authorCreatedAt = firstMessage?.createdAt ?? thread.createdAt;

  return (
    <DocsCollabCardShell
      cardRef={cardRef}
      className="docs-comments-thread-card"
      exitVariant="comment"
      active={active}
      isExiting={isExiting}
      onSelect={onSelect}
      onAnimationEnd={handleExitAnimationEnd}
      dataAttributes={{ "data-thread-id": thread.id }}
    >
      <DocsCollabCardHeader
        authorName={authorName}
        createdAt={authorCreatedAt}
        actions={
          isDraft ? (
            <button
              type="button"
              className="docs-comments-thread-card__delete"
              aria-label={labels.commentsDelete}
              onClick={(event) => {
                event.stopPropagation();
                if (onCancelDraft) runExitAnimation(onCancelDraft);
              }}
            >
              <Trash2 className="docs-comments-thread-card__delete-icon" aria-hidden />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="docs-comments-thread-card__resolve"
                aria-label={labels.commentsResolve}
                onClick={(event) => {
                  event.stopPropagation();
                  runExitAnimation(onResolve);
                }}
              >
                <Check className="docs-comments-thread-card__resolve-icon" aria-hidden />
                Resolve
              </button>
              <button
                type="button"
                className="docs-comments-thread-card__delete"
                aria-label={labels.commentsDelete}
                onClick={(event) => {
                  event.stopPropagation();
                  runExitAnimation(onDelete);
                }}
              >
                <Trash2 className="docs-comments-thread-card__delete-icon" aria-hidden />
              </button>
            </>
          )
        }
      />

      {thread.anchorText ? (
        <blockquote className="docs-comments-thread-card__quote">
          <span aria-hidden>&ldquo;</span>
          {thread.anchorText}
          <span aria-hidden>&rdquo;</span>
        </blockquote>
      ) : null}

      {firstMessage ? <p className="docs-comments-thread-card__body">{firstMessage.body}</p> : null}

      {!isDraft ? (
        <div className="docs-comments-thread-card__reactions" role="group" aria-label="Reactions">
          {visibleReactions.map((emoji) => {
            const count = reactionCount(thread.reactions, emoji);
            const reacted = userReacted(thread.reactions, emoji, currentUserId);
            return (
              <button
                key={emoji}
                type="button"
                className="docs-comments-thread-card__reaction"
                data-reacted={reacted ? "true" : "false"}
                aria-pressed={reacted}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleReaction(emoji);
                }}
              >
                <span className="docs-comments-thread-card__reaction-emoji" aria-hidden>
                  {emoji}
                </span>
                <span className="docs-comments-thread-card__reaction-count">{count}</span>
              </button>
            );
          })}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="docs-comments-thread-card__reaction docs-comments-thread-card__reaction--add"
                aria-label="Add reaction"
                onClick={(event) => event.stopPropagation()}
              >
                <Smile className="docs-comments-thread-card__reaction-add-icon" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="top"
              className="docs-comments-thread-card__reaction-picker"
            >
              <div className="docs-comments-thread-card__reaction-picker-grid">
                {DOCS_COMMENT_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="docs-comments-thread-card__reaction-picker-item"
                    aria-pressed={userReacted(thread.reactions, emoji, currentUserId)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleReaction(emoji);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      {replies.length > 0 ? (
        <ul className="docs-comments-thread-card__replies" aria-live="polite">
          {replies.map((message) => (
            <li key={message.id}>
              <DocsCollabMessageReply message={message} />
            </li>
          ))}
        </ul>
      ) : null}

      {active ? (
        <div
          className="docs-comments-thread-card__composer"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            ref={composerRef}
            type="text"
            className="docs-comments-thread-card__composer-input"
            value={composerText}
            placeholder={
              isDraft ? labels.commentsComposePlaceholder : labels.commentsReplyPlaceholder
            }
            aria-label={
              isDraft ? labels.commentsComposePlaceholder : labels.commentsReplyPlaceholder
            }
            onChange={(event) => setComposerText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitComposer();
              }
              if (isDraft && event.key === "Escape") {
                event.preventDefault();
                if (onCancelDraft) runExitAnimation(onCancelDraft);
              }
            }}
          />
          <button
            type="button"
            className="docs-comments-thread-card__composer-post"
            disabled={!canPost}
            onClick={submitComposer}
          >
            {isDraft ? labels.commentsAdd : labels.commentsReplyAction}
          </button>
        </div>
      ) : null}
    </DocsCollabCardShell>
  );
}
