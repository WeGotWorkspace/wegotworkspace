import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type MouseEvent,
} from "react";
import { Check, X } from "lucide-react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import { formatRelativeTimestamp } from "../docs-comments/docs-comments-utils";
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

const CARD_EXIT_ANIMATION_MS = 200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isNestedInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, input, textarea, select"));
}

export function DocsSuggestionCard({
  suggestion,
  labels,
  active,
  onSelect,
  onAccept,
  onReject,
}: DocsSuggestionCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const exitActionRef = useRef<(() => void) | null>(null);

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
      if (event.animationName !== "docs-suggestion-card-evaporate") return;
      completeExitAnimation();
    },
    [completeExitAnimation],
  );

  useEffect(() => {
    if (!isExiting) return;
    const timeoutId = window.setTimeout(completeExitAnimation, CARD_EXIT_ANIMATION_MS + 50);
    return () => window.clearTimeout(timeoutId);
  }, [completeExitAnimation, isExiting]);

  return (
    <article
      ref={cardRef}
      className="docs-suggestion-card"
      data-change-id={suggestion.changeId}
      data-active={active ? "true" : "false"}
      data-exiting={isExiting ? "true" : "false"}
      aria-current={active ? "true" : undefined}
      aria-hidden={isExiting ? true : undefined}
      onClick={handleCardClick}
      onAnimationEnd={handleExitAnimationEnd}
    >
      <div className="docs-suggestion-card__header">
        <div className="docs-suggestion-card__author-row">
          <UserAvatar
            displayName={suggestion.authorName}
            compact
            size="sm"
            className="docs-suggestion-card__avatar"
          />
          <div className="docs-suggestion-card__meta">
            <p className="docs-suggestion-card__author">{suggestion.authorName}</p>
            <time className="docs-suggestion-card__time" dateTime={suggestion.timestamp}>
              {formatRelativeTimestamp(suggestion.timestamp)}
            </time>
          </div>
        </div>
        <div className="docs-suggestion-card__actions">
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
        </div>
      </div>

      <SuggestionDiffBody parts={suggestion.parts} ariaLabel={suggestion.summary} />
    </article>
  );
}
