import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import { forwardOverlayWheelToEditorScroll } from "@/text-editor-core/src/text-editor-overlay-utils";
import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import { escapeTrackChangeIdForSelector } from "@/text-editor-core/src/text-editor-track-changes";
import { DocsSuggestionCard } from "./docs-suggestion-card";
import {
  measureCommentCardViewportLeft,
  measureCommentFloatingLayerTopFromSurface,
} from "../docs-comments/docs-comments-positioning";
import { measureFloatingLayerContainerMaxHeight } from "../docs-comments/docs-comments-mark-visibility";
import "./docs-suggestions-floating-layer.css";

export type DocsSuggestionsFloatingLayerProps = {
  editor: Editor | null;
  visible: boolean;
  labels: DocsUILabels;
  suggestions: DocsTrackChangeGroup[];
  activeChangeId: string | null;
  onSelectSuggestion: (changeId: string) => void;
  onAcceptSuggestion: (changeId: string) => void;
  onRejectSuggestion: (changeId: string) => void;
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

export function DocsSuggestionsFloatingLayer({
  editor,
  visible,
  labels,
  suggestions,
  activeChangeId,
  onSelectSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
}: DocsSuggestionsFloatingLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [containerLayout, setContainerLayout] = useState<FloatingLayerContainerLayout | null>(null);

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
    if (!editor || !visible) return;

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
  }, [editor, visible, syncContainerLayout]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !editor || !visible) return;

    const handleWheel = (event: WheelEvent) => {
      forwardOverlayWheelToEditorScroll(event, editor.view.dom, layer);
    };

    layer.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => layer.removeEventListener("wheel", handleWheel, { capture: true });
  }, [editor, visible]);

  useEffect(() => {
    if (!visible || !activeChangeId || !editor) return;

    const mark = editor.view.dom.querySelector(
      `[data-change-id="${escapeTrackChangeIdForSelector(activeChangeId)}"]`,
    );
    if (mark) {
      mark.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    const suggestion = suggestions.find((item) => item.changeId === activeChangeId);
    if (!suggestion) return;

    try {
      const coords = editor.view.coordsAtPos(suggestion.from);
      const scrollContainer = editor.view.dom.closest(
        ".text-editor-sheet__surface",
      ) as HTMLElement | null;
      if (!scrollContainer) return;
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetScrollTop =
        coords.top -
        containerRect.top +
        scrollContainer.scrollTop -
        containerRect.height * SCROLL_ANCHOR_VIEWPORT_OFFSET_FRACTION;
      scrollContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
    } catch {
      // Anchor position no longer valid.
    }
  }, [activeChangeId, editor, suggestions, visible]);

  if (!editor || suggestions.length === 0 || !visible || containerLayout == null) return null;

  return (
    <div
      ref={layerRef}
      className="docs-suggestions-floating-layer"
      data-visible="true"
      aria-label={labels.suggestionsSidebarTitle}
      style={{
        top: `${containerLayout.top}px`,
        left: `${containerLayout.left}px`,
        maxHeight: `${containerLayout.maxHeight}px`,
      }}
    >
      <div className="docs-suggestions-floating-layer__stack">
        {suggestions.map((suggestion) => {
          const isActive = activeChangeId === suggestion.changeId;
          const cardMaxHeight = Math.min(384, Math.max(containerLayout.maxHeight - 16, 120));

          return (
            <div
              key={suggestion.changeId}
              className="docs-suggestions-floating-layer__card"
              data-change-id={suggestion.changeId}
              data-active={isActive ? "true" : "false"}
              style={{
                ["--docs-suggestion-card-max-height" as string]: `${cardMaxHeight}px`,
              }}
            >
              <DocsSuggestionCard
                suggestion={suggestion}
                labels={labels}
                active={isActive}
                onSelect={() => onSelectSuggestion(suggestion.changeId)}
                onAccept={() => onAcceptSuggestion(suggestion.changeId)}
                onReject={() => onRejectSuggestion(suggestion.changeId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
