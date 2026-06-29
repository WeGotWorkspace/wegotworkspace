import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";
import { prefersReducedMotion } from "./docs-collab-card-utils";

export const DOCS_COLLAB_CARD_EXIT_ANIMATION_MS = 200;

export type UseDocsCollabCardExitOptions = {
  exitAnimationName: string;
};

export type UseDocsCollabCardExitResult = {
  cardRef: React.RefObject<HTMLElement | null>;
  isExiting: boolean;
  runExitAnimation: (action: () => void) => void;
  handleExitAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
};

export function useDocsCollabCardExit({
  exitAnimationName,
}: UseDocsCollabCardExitOptions): UseDocsCollabCardExitResult {
  const [isExiting, setIsExiting] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const exitActionRef = useRef<(() => void) | null>(null);

  const completeExitAnimation = useCallback(() => {
    const action = exitActionRef.current;
    if (!action) return;
    exitActionRef.current = null;
    action();
  }, []);

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

  const handleExitAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (event.target !== cardRef.current) return;
      if (event.animationName !== exitAnimationName) return;
      completeExitAnimation();
    },
    [completeExitAnimation, exitAnimationName],
  );

  useEffect(() => {
    if (!isExiting) return;
    const timeoutId = window.setTimeout(
      completeExitAnimation,
      DOCS_COLLAB_CARD_EXIT_ANIMATION_MS + 50,
    );
    return () => window.clearTimeout(timeoutId);
  }, [completeExitAnimation, isExiting]);

  return {
    cardRef,
    isExiting,
    runExitAnimation,
    handleExitAnimationEnd,
  };
}
