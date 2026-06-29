import { useMemo } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { DOCS_COMMENT_REACTION_EMOJIS, type DocsCommentReaction } from "../docs-comments-types";
import "./docs-collab-reactions.css";

export type DocsCollabReactionsProps = {
  reactions?: DocsCommentReaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  className?: string;
};

function reactionCount(reactions: DocsCommentReaction[] | undefined, emoji: string): number {
  return reactions?.find((reaction) => reaction.emoji === emoji)?.userIds.length ?? 0;
}

function userReacted(
  reactions: DocsCommentReaction[] | undefined,
  emoji: string,
  userId: string,
): boolean {
  return (
    reactions?.some((reaction) => reaction.emoji === emoji && reaction.userIds.includes(userId)) ??
    false
  );
}

export function DocsCollabReactions({
  reactions,
  currentUserId,
  onToggleReaction,
  className,
}: DocsCollabReactionsProps) {
  const visibleReactions = useMemo(
    () =>
      reactions
        ?.filter((reaction) => reaction.userIds.length > 0)
        .map((reaction) => reaction.emoji) ?? [],
    [reactions],
  );

  const rootClassName = className ? `docs-collab-reactions ${className}` : "docs-collab-reactions";

  return (
    <div className={rootClassName} role="group" aria-label="Reactions">
      {visibleReactions.map((emoji) => {
        const count = reactionCount(reactions, emoji);
        const reacted = userReacted(reactions, emoji, currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            className="docs-collab-reactions__reaction"
            data-reacted={reacted ? "true" : "false"}
            aria-pressed={reacted}
            onClick={(event) => {
              event.stopPropagation();
              onToggleReaction(emoji);
            }}
          >
            <span className="docs-collab-reactions__reaction-emoji" aria-hidden>
              {emoji}
            </span>
            <span className="docs-collab-reactions__reaction-count">{count}</span>
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="docs-collab-reactions__reaction docs-collab-reactions__reaction--add"
            aria-label="Add reaction"
            onClick={(event) => event.stopPropagation()}
          >
            <Smile className="docs-collab-reactions__reaction-add-icon" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="docs-collab-reactions__picker">
          <div className="docs-collab-reactions__picker-grid">
            {DOCS_COMMENT_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="docs-collab-reactions__picker-item"
                aria-pressed={userReacted(reactions, emoji, currentUserId)}
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
  );
}
