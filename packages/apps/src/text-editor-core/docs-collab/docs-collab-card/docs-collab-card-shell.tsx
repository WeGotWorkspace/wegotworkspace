import type { AnimationEvent, MouseEvent, ReactNode, RefObject } from "react";
import { isNestedInteractiveTarget } from "./docs-collab-card-utils";
import "./docs-collab-card.css";

export type DocsCollabCardExitVariant = "comment" | "suggestion";

export type DocsCollabCardShellProps = {
  cardRef: RefObject<HTMLElement | null>;
  className: string;
  exitVariant: DocsCollabCardExitVariant;
  active: boolean;
  isExiting: boolean;
  onSelect: () => void;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  dataAttributes?: Record<string, string | undefined>;
  children: ReactNode;
};

export function DocsCollabCardShell({
  cardRef,
  className,
  exitVariant,
  active,
  isExiting,
  onSelect,
  onAnimationEnd,
  dataAttributes = {},
  children,
}: DocsCollabCardShellProps) {
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isExiting || isNestedInteractiveTarget(event.target)) return;
    onSelect();
  };

  return (
    <article
      ref={cardRef}
      className={`docs-collab-card ${className}`}
      data-active={active ? "true" : "false"}
      data-exiting={isExiting ? "true" : "false"}
      data-exit-animation={isExiting ? exitVariant : undefined}
      aria-current={active ? "true" : undefined}
      aria-hidden={isExiting ? true : undefined}
      onClick={handleCardClick}
      onAnimationEnd={onAnimationEnd}
      {...dataAttributes}
    >
      {children}
    </article>
  );
}
