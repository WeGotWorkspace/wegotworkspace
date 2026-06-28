import type { Editor } from "@tiptap/react";
import { escapeCommentIdForSelector } from "@/text-editor-core/src/text-editor-comment-commands";
import type { DocsCommentThread } from "../docs-comments-types";
import {
  ensureCommentViewTimelinePolyfill,
  supportsCommentViewTimeline,
  usesCommentViewTimelinePolyfill,
} from "./docs-comments-view-timeline-polyfill";

export const DOCS_COMMENT_SCROLLPORT_SELECTOR = ".text-editor-sheet--fill";
export const DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID = "docs-comments-view-timeline-styles";

/** Scroll-linked fade range — keep in sync with docs-comments-floating-layer.css */
export const DOCS_COMMENT_CARD_VISIBILITY_ANIMATION_RANGE = "entry 0% exit 100%";

export type DocsCommentVisibilityMode = "timeline" | "observer" | "static";

/** Stable view-timeline name for a comment thread mark. */
export function commentViewTimelineName(threadId: string): `--docs-cmt-${string}` {
  const safe = threadId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `--docs-cmt-${safe}`;
}

export function findDocsCommentScrollport(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null;
  return editor.view.dom.closest(DOCS_COMMENT_SCROLLPORT_SELECTOR) as HTMLElement | null;
}

export function resolveThreadDocumentPosition(editor: Editor, thread: DocsCommentThread): number {
  if (typeof thread.anchorFrom === "number") return thread.anchorFrom;

  const mark = editor.view.dom.querySelector(
    `[data-comment-id="${escapeCommentIdForSelector(thread.id)}"]`,
  );
  if (!mark) return Number.MAX_SAFE_INTEGER;

  try {
    return editor.view.posAtDOM(mark, 0);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Order floating cards to match document flow (top-to-bottom). */
export function sortThreadsByDocumentOrder(
  editor: Editor,
  threads: DocsCommentThread[],
): DocsCommentThread[] {
  return [...threads].sort((left, right) => {
    const leftPos = resolveThreadDocumentPosition(editor, left);
    const rightPos = resolveThreadDocumentPosition(editor, right);
    if (leftPos !== rightPos) return leftPos - rightPos;
    return left.id.localeCompare(right.id);
  });
}

export { supportsCommentViewTimeline };

export function prefersReducedCommentMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolveCommentVisibilityMode(): DocsCommentVisibilityMode {
  if (prefersReducedCommentMotion()) return "static";
  if (supportsCommentViewTimeline()) return "timeline";
  return "observer";
}

export async function resolveCommentVisibilityModeAsync(): Promise<DocsCommentVisibilityMode> {
  if (prefersReducedCommentMotion()) return "static";
  if (supportsCommentViewTimeline()) return "timeline";
  const polyfillReady = await ensureCommentViewTimelinePolyfill();
  return polyfillReady ? "timeline" : "observer";
}

export function buildCommentViewTimelineStylesheet(threadIds: readonly string[]): string {
  if (threadIds.length === 0) return "";

  const markRules = threadIds.map((id) => {
    const selector = `[data-comment-id="${escapeCommentIdForSelector(id)}"]`;
    const name = commentViewTimelineName(id);
    return `${selector}{view-timeline-name:${name};view-timeline-axis:block;}`;
  });

  const scopeRule = `${DOCS_COMMENT_SCROLLPORT_SELECTOR}{timeline-scope:${buildCommentTimelineScope(threadIds)};}`;

  const cardRules = threadIds.map((id) => {
    const selector = `.docs-comments-floating-layer[data-visibility-mode="timeline"] .docs-comments-floating-layer__card[data-thread-id="${escapeCommentIdForSelector(id)}"]`;
    return `${selector}{animation-timeline:${commentViewTimelineName(id)};animation-range:${DOCS_COMMENT_CARD_VISIBILITY_ANIMATION_RANGE};}`;
  });

  return [...markRules, scopeRule, ...cardRules].join("\n");
}

function clearLegacyInlineViewTimelines(editor: Editor): void {
  editor.view.dom.querySelectorAll("[data-comment-id]").forEach((node) => {
    const element = node as HTMLElement;
    element.style.removeProperty("view-timeline-name");
    element.style.removeProperty("view-timeline-axis");
  });

  findDocsCommentScrollport(editor)?.style.removeProperty("timeline-scope");
}

function applyCommentViewTimelineStylesheet(css: string): void {
  if (typeof document === "undefined") return;

  if (!css) {
    document.getElementById(DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID)?.remove();
    return;
  }

  const replaceForPolyfill = usesCommentViewTimelinePolyfill();
  const existing = document.getElementById(
    DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID,
  ) as HTMLStyleElement | null;

  if (replaceForPolyfill && existing?.isConnected) {
    const replacement = document.createElement("style");
    replacement.id = DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID;
    replacement.textContent = css;
    existing.replaceWith(replacement);
    return;
  }

  const styleEl = existing ?? document.createElement("style");
  styleEl.id = DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID;
  styleEl.textContent = css;
  if (!existing) document.head.append(styleEl);
}

/** Inject view-timeline stylesheet rules for marks, scope, and card animation-timeline. */
export function syncCommentViewTimelineStyles(editor: Editor, threadIds: readonly string[]): void {
  if (editor.isDestroyed) return;

  clearLegacyInlineViewTimelines(editor);
  applyCommentViewTimelineStylesheet(buildCommentViewTimelineStylesheet(threadIds));
}

export function buildCommentTimelineScope(threadIds: readonly string[]): string {
  return threadIds.map((id) => commentViewTimelineName(id)).join(", ");
}

export type CommentMarkVisibilityObserver = {
  disconnect: () => void;
  resync: () => void;
};

type ObserveCommentMarkVisibilityOptions = {
  rootMargin?: string;
  threshold?: number | number[];
};

function collectCommentMarks(editor: Editor, threadIds: readonly string[]): Map<string, Element> {
  const marks = new Map<string, Element>();
  if (editor.isDestroyed) return marks;

  for (const id of threadIds) {
    const mark = editor.view.dom.querySelector(
      `[data-comment-id="${escapeCommentIdForSelector(id)}"]`,
    );
    if (mark) marks.set(id, mark);
  }

  return marks;
}

/** Geometry check for static/reduced-motion and IO fallback initial sync. */
export function isCommentMarkInScrollport(mark: Element, scrollport: HTMLElement | null): boolean {
  if (!scrollport) return true;

  const markRect = mark.getBoundingClientRect();
  const rootRect = scrollport.getBoundingClientRect();

  return (
    markRect.bottom > rootRect.top &&
    markRect.top < rootRect.bottom &&
    markRect.right > rootRect.left &&
    markRect.left < rootRect.right
  );
}

export function syncCommentCardVisibilityFromMarks(
  marks: ReadonlyMap<string, Element>,
  scrollport: HTMLElement | null,
  getCardElement: (threadId: string) => HTMLElement | undefined,
): void {
  for (const [id, mark] of marks) {
    const card = getCardElement(id);
    if (!card) continue;
    card.setAttribute(
      "data-in-view",
      isCommentMarkInScrollport(mark, scrollport) ? "true" : "false",
    );
  }
}

/** Geometry-only visibility sync for static (reduced-motion) mode. */
export function syncCommentMarkVisibility(
  editor: Editor,
  getCardElement: (threadId: string) => HTMLElement | undefined,
  threadIds: readonly string[],
): void {
  if (editor.isDestroyed) return;

  const scrollport = findDocsCommentScrollport(editor);
  const marks = collectCommentMarks(editor, threadIds);
  syncCommentCardVisibilityFromMarks(marks, scrollport, getCardElement);
}

/**
 * Fallback visibility driver when view-timeline is unavailable
 * (polyfill failed and `@supports not (animation-timeline: view())`).
 */
export function observeCommentMarkVisibility(
  editor: Editor,
  getCardElement: (threadId: string) => HTMLElement | undefined,
  threadIds: readonly string[],
  options: ObserveCommentMarkVisibilityOptions = {},
): CommentMarkVisibilityObserver {
  if (editor.isDestroyed) {
    return { disconnect: () => {}, resync: () => {} };
  }

  const scrollport = findDocsCommentScrollport(editor);
  let marks = collectCommentMarks(editor, threadIds);

  syncCommentCardVisibilityFromMarks(marks, scrollport, getCardElement);

  if (marks.size === 0 || typeof IntersectionObserver === "undefined") {
    return {
      disconnect: () => {},
      resync: () => {
        marks = collectCommentMarks(editor, threadIds);
        syncCommentCardVisibilityFromMarks(marks, scrollport, getCardElement);
      },
    };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute("data-comment-id");
        if (!id) continue;
        const card = getCardElement(id);
        if (!card) continue;
        card.setAttribute("data-in-view", entry.isIntersecting ? "true" : "false");
      }
    },
    {
      root: scrollport,
      rootMargin: options.rootMargin ?? "0px",
      threshold: options.threshold ?? 0,
    },
  );

  const observeMarks = (nextMarks: ReadonlyMap<string, Element>) => {
    observer.disconnect();
    nextMarks.forEach((mark) => observer.observe(mark));
  };

  observeMarks(marks);

  return {
    disconnect: () => observer.disconnect(),
    resync: () => {
      marks = collectCommentMarks(editor, threadIds);
      syncCommentCardVisibilityFromMarks(marks, scrollport, getCardElement);
      observeMarks(marks);
    },
  };
}

export function measureFloatingLayerContainerMaxHeight(
  topPx: number,
  footerElement: HTMLElement | null,
  bottomGapPx = 16,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0,
): number {
  const maxBottom =
    footerElement != null
      ? footerElement.getBoundingClientRect().top - bottomGapPx
      : viewportHeight - bottomGapPx;
  return Math.max(maxBottom - topPx, 0);
}
