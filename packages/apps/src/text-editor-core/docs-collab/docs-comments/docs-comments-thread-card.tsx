import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type MouseEvent,
} from "react";
import { Check, Smile, Trash2 } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { DOCS_COMMENT_REACTION_EMOJIS, type DocsCommentThread } from "../docs-comments-types";
import { DocsCommentsReply } from "./docs-comments-reply";
import { formatRelativeTimestamp } from "./docs-comments-utils";
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

const THREAD_CARD_EXIT_ANIMATION_MS = 200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isNestedInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [role='menu'], [role='menuitem'], [data-radix-popper-content-wrapper]",
    ),
  );
}

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
  const [isExiting, setIsExiting] = useState(false);
  const composerRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const exitActionRef = useRef<(() => void) | null>(null);
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

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isExiting || isNestedInteractiveTarget(event.target)) return;
    onSelect();
  };

  const runExitAnimation = useCallback(
    (action: () => void) => {
      if (isExiting) return;
      if (prefersReducedMotion()) {
        action();
        return;
      }
      exitActionRef.current = action;
      setIsExiting(true);
    },
    [isExiting],
  );

  const completeExitAnimation = useCallback(() => {
    const action = exitActionRef.current;
    if (!action) return;
    exitActionRef.current = null;
    action();
  }, []);

  const handleExitAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (event.target !== cardRef.current) return;
      if (event.animationName !== "docs-comments-thread-card-evaporate") return;
      completeExitAnimation();
    },
    [completeExitAnimation],
  );

  useEffect(() => {
    if (!isExiting) return;
    const timeoutId = window.setTimeout(completeExitAnimation, THREAD_CARD_EXIT_ANIMATION_MS + 50);
    return () => window.clearTimeout(timeoutId);
  }, [completeExitAnimation, isExiting]);

  if (!isDraft && !firstMessage) return null;

  const authorName = firstMessage?.author.name ?? thread.createdBy.name;
  const authorCreatedAt = firstMessage?.createdAt ?? thread.createdAt;

  return (
    <article
      ref={cardRef}
      className="docs-comments-thread-card"
      data-thread-id={thread.id}
      data-active={active ? "true" : "false"}
      data-exiting={isExiting ? "true" : "false"}
      aria-current={active ? "true" : undefined}
      aria-hidden={isExiting ? true : undefined}
      onClick={handleCardClick}
      onAnimationEnd={handleExitAnimationEnd}
    >
      <div className="docs-comments-thread-card__header">
        <div className="docs-comments-thread-card__author-row">
          <UserAvatar
            displayName={authorName}
            compact
            size="sm"
            className="docs-comments-thread-card__avatar"
          />
          <div className="docs-comments-thread-card__meta">
            <p className="docs-comments-thread-card__author">{authorName}</p>
            <time className="docs-comments-thread-card__time" dateTime={authorCreatedAt}>
              {formatRelativeTimestamp(authorCreatedAt)}
            </time>
          </div>
        </div>
        <div className="docs-comments-thread-card__actions">
          {isDraft ? (
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
          )}
        </div>
      </div>

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
              <DocsCommentsReply message={message} />
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
    </article>
  );
}
