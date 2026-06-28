import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { forwardOverlayWheelToEditorScroll } from "@/text-editor-core/src/text-editor-overlay-utils";
import { escapeCommentIdForSelector } from "@/text-editor-core/src/text-editor-comment-commands";
import type { DocsCommentThread } from "../docs-comments-types";
import { DocsCommentsThreadCard } from "./docs-comments-thread-card";
import { mergeDraftThreadWithOpenThreads } from "./docs-comments-utils";
import {
  measureFloatingLayerContainerMaxHeight,
  observeCommentMarkVisibility,
  resolveCommentVisibilityModeAsync,
  sortThreadsByDocumentOrder,
  syncCommentMarkVisibility,
  syncCommentViewTimelineStyles,
  type DocsCommentVisibilityMode,
} from "./docs-comments-mark-visibility";
import {
  measureCommentCardViewportLeft,
  measureCommentFloatingLayerTopFromSurface,
} from "./docs-comments-positioning";

import "./docs-comments-floating-layer.css";

export type DocsCommentsFloatingLayerProps = {
  editor: Editor | null;
  visible: boolean;
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

const CARD_MARGIN_GAP_PX = 16;
const CARD_BOTTOM_INSET_PX = 16;
const SCROLL_ANCHOR_VIEWPORT_OFFSET_FRACTION = 1 / 3;
const WORKSPACE_FOOTER_SELECTOR = ".docs-workspace__stats-footer";
const EDITOR_FORMAT_BAR_SELECTOR = ".text-editor-format-bar";

type FloatingLayerContainerLayout = {
  top: number;
  left: number;
  maxHeight: number;
};

export function DocsCommentsFloatingLayer({
  editor,
  visible,
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
}: DocsCommentsFloatingLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const [containerLayout, setContainerLayout] = useState<FloatingLayerContainerLayout | null>(null);
  const [visibilityMode, setVisibilityMode] = useState<DocsCommentVisibilityMode>("static");
  const showLayer = visible || draftThread != null;

  const registerCardRef = useCallback((threadId: string, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current.set(threadId, node);
      return;
    }
    cardRefs.current.delete(threadId);
  }, []);

  const displayThreads = useMemo(
    () => mergeDraftThreadWithOpenThreads(threads, draftThread),
    [draftThread, threads],
  );

  const orderedThreads = useMemo(() => {
    if (!editor) return displayThreads;
    return sortThreadsByDocumentOrder(editor, displayThreads);
  }, [displayThreads, editor]);

  const markedThreadIds = useMemo(
    () => orderedThreads.filter((thread) => thread.messages.length > 0).map((thread) => thread.id),
    [orderedThreads],
  );

  const syncContainerLayout = useCallback(() => {
    if (!editor) return;

    const surface = editor.view.dom.closest(".text-editor-sheet__surface") as HTMLElement | null;
    const footer = document.querySelector(WORKSPACE_FOOTER_SELECTOR) as HTMLElement | null;
    const left = measureCommentCardViewportLeft(surface, CARD_MARGIN_GAP_PX);
    const top = measureCommentFloatingLayerTopFromSurface(surface);
    const maxHeight = measureFloatingLayerContainerMaxHeight(top, footer, CARD_BOTTOM_INSET_PX);

    if (left == null) {
      setContainerLayout(null);
      return;
    }

    setContainerLayout({ top, left, maxHeight });
  }, [editor]);

  useEffect(() => {
    if (!editor || !showLayer) return;

    syncContainerLayout();

    const surface = editor.view.dom.closest(".text-editor-sheet__surface") as HTMLElement | null;
    const formatBar = editor.view.dom
      .closest(".text-editor")
      ?.querySelector(EDITOR_FORMAT_BAR_SELECTOR) as HTMLElement | null;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncContainerLayout) : null;
    if (surface) resizeObserver?.observe(surface);
    if (formatBar) resizeObserver?.observe(formatBar);
    window.addEventListener("resize", syncContainerLayout);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncContainerLayout);
    };
  }, [editor, showLayer, syncContainerLayout]);

  useEffect(() => {
    if (!editor || !showLayer) return;

    const syncTimelines = () => {
      syncCommentViewTimelineStyles(editor, markedThreadIds);
    };

    syncTimelines();
    editor.on("transaction", syncTimelines);
    editor.on("update", syncTimelines);

    return () => {
      editor.off("transaction", syncTimelines);
      editor.off("update", syncTimelines);
      syncCommentViewTimelineStyles(editor, []);
    };
  }, [editor, markedThreadIds, showLayer]);

  useEffect(() => {
    if (!editor || !showLayer) return;

    let cancelled = false;
    void resolveCommentVisibilityModeAsync().then((mode) => {
      if (!cancelled) setVisibilityMode(mode);
    });

    return () => {
      cancelled = true;
    };
  }, [editor, markedThreadIds, showLayer]);

  useEffect(() => {
    if (!editor || !showLayer || visibilityMode !== "observer") return;

    const getCardElement = (threadId: string) => cardRefs.current.get(threadId);
    const visibilityObserver = observeCommentMarkVisibility(
      editor,
      getCardElement,
      markedThreadIds,
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
  }, [editor, markedThreadIds, showLayer, visibilityMode]);

  useEffect(() => {
    if (!editor || !showLayer || visibilityMode !== "static") return;

    const getCardElement = (threadId: string) => cardRefs.current.get(threadId);
    const syncVisibility = () => syncCommentMarkVisibility(editor, getCardElement, markedThreadIds);

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
  }, [editor, markedThreadIds, showLayer, visibilityMode]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !editor || !showLayer) return;

    const handleWheel = (event: WheelEvent) => {
      forwardOverlayWheelToEditorScroll(event, editor.view.dom, layer);
    };

    layer.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => layer.removeEventListener("wheel", handleWheel, { capture: true });
  }, [editor, showLayer]);

  useEffect(() => {
    if (!showLayer || !activeThreadId || !editor) return;

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
  }, [activeThreadId, editor, orderedThreads, showLayer]);

  if (!editor || orderedThreads.length === 0 || !showLayer || containerLayout == null) return null;

  return (
    <div
      ref={layerRef}
      className="docs-comments-floating-layer"
      data-visible="true"
      data-visibility-mode={visibilityMode}
      aria-label={labels.commentsSidebarTitle}
      style={{
        top: `${containerLayout.top}px`,
        left: `${containerLayout.left}px`,
        maxHeight: `${containerLayout.maxHeight}px`,
      }}
    >
      <div className="docs-comments-floating-layer__stack">
        {orderedThreads.map((thread) => {
          const isDraft = thread.messages.length === 0;
          const isActive = activeThreadId === thread.id;
          const cardMaxHeight = Math.min(384, Math.max(containerLayout.maxHeight - 16, 120));

          return (
            <div
              key={thread.id}
              ref={(node) => registerCardRef(thread.id, node)}
              className="docs-comments-floating-layer__card"
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
                onDelete={() => onDeleteThread(thread.id)}
                onCancelDraft={isDraft ? onCancelDraft : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
