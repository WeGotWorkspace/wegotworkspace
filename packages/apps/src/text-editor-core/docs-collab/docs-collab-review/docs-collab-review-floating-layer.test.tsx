/** @vitest-environment jsdom */
import { cleanup, render, waitFor } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentMark } from "@/text-editor-core/src/text-editor-comment-commands";
import { docsLabels } from "@/docs-core/src/docs-labels";
import type { DocsCommentThread } from "../docs-comments-types";
import { DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID } from "../docs-comments/docs-comments-mark-visibility";
import type { DocsSuggestionWithThread } from "../docs-suggestions-types";
import { DocsCollabReviewFloatingLayer } from "./docs-collab-review-floating-layer";

import "./docs-collab-review-floating-layer.css";

function mountEditor(content: string) {
  const editor = new Editor({
    extensions: [StarterKit.configure({ undoRedo: false }), CommentMark],
    content,
  });

  const editorRoot = document.createElement("div");
  editorRoot.className = "text-editor";

  const sheet = document.createElement("div");
  sheet.className = "text-editor-sheet text-editor-sheet--fill";
  const surface = document.createElement("div");
  surface.className = "text-editor-sheet__surface";
  Object.defineProperty(surface, "getBoundingClientRect", {
    value: () => ({
      x: 120,
      y: 96,
      top: 96,
      left: 120,
      right: 720,
      bottom: 900,
      width: 600,
      height: 804,
      toJSON: () => ({}),
    }),
  });
  surface.append(editor.view.dom);
  sheet.append(surface);
  editorRoot.append(sheet);
  document.body.append(editorRoot);

  return editor;
}

const baseThread = (id: string, anchorFrom: number, anchorText: string): DocsCommentThread => ({
  id,
  anchorText,
  anchorFrom,
  createdAt: "2026-01-01T00:00:00.000Z",
  createdBy: { id: "u-1", name: "Alex" },
  resolved: false,
  messages: [
    {
      id: `${id}-m`,
      body: "Note",
      createdAt: "2026-01-01T00:01:00.000Z",
      author: { id: "u-1", name: "Alex" },
    },
  ],
});

const baseSuggestion = (changeId: string, from: number): DocsSuggestionWithThread => ({
  changeId,
  authorName: "Alex",
  authorColor: "#2563eb",
  timestamp: "2026-01-01T00:00:00.000Z",
  from,
  to: from + 1,
  anchorText: "Hello",
  summary: "Inserted: !",
  parts: [],
  messages: [],
});

const noop = () => {};

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  vi.stubGlobal("CSS", {
    supports: () => true,
  });

  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn();
    root = null;
    rootMargin = "";
    thresholds = [];
    constructor(_callback: IntersectionObserverCallback) {}
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  document.getElementById(DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID)?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DocsCollabReviewFloatingLayer", () => {
  it("renders comment cards in timeline mode with unified layer animation-timeline rules", async () => {
    const editor = mountEditor(
      '<p><span data-comment-id="t-1" class="comment-mark">Hello</span></p>',
    );

    const { container } = render(
      <DocsCollabReviewFloatingLayer
        editor={editor}
        visible
        labels={docsLabels}
        threads={[baseThread("t-1", 8, "Hello")]}
        suggestions={[]}
        currentUserId="u-1"
        activeThreadId={null}
        activeChangeId={null}
        onSelectThread={noop}
        onAddReply={noop}
        onToggleReaction={noop}
        onResolveThread={noop}
        onSelectSuggestion={noop}
        onAcceptSuggestion={noop}
        onRejectSuggestion={noop}
        onAddSuggestionReply={noop}
        onToggleSuggestionReaction={noop}
      />,
    );

    const layer = container.querySelector(".docs-collab-review-floating-layer") as HTMLElement;
    expect(layer).not.toBeNull();

    await waitFor(() => {
      expect(layer.dataset.visibilityMode).toBe("timeline");
    });

    const commentCards = container.querySelectorAll(
      ".docs-collab-review-floating-layer__card--comment",
    );
    expect(commentCards).toHaveLength(1);

    const stylesheet =
      document.getElementById(DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID)?.textContent ?? "";
    expect(stylesheet).toContain(
      '.docs-collab-review-floating-layer[data-visibility-mode="timeline"] .docs-collab-review-floating-layer__card--comment[data-thread-id="t-1"]{animation-timeline:--docs-cmt-t-1;animation-range:entry 0% exit 100%;}',
    );

    editor.destroy();
  });

  it("renders both suggestion and comment sections when both are present", async () => {
    const editor = mountEditor(
      '<p><span data-comment-id="t-1" class="comment-mark">Hello</span><ins data-change-id="s-1">!</ins></p>',
    );

    const { container } = render(
      <DocsCollabReviewFloatingLayer
        editor={editor}
        visible
        labels={docsLabels}
        threads={[baseThread("t-1", 8, "Hello")]}
        suggestions={[baseSuggestion("s-1", 4)]}
        currentUserId="u-1"
        activeThreadId={null}
        activeChangeId={null}
        onSelectThread={noop}
        onAddReply={noop}
        onToggleReaction={noop}
        onResolveThread={noop}
        onSelectSuggestion={noop}
        onAcceptSuggestion={noop}
        onRejectSuggestion={noop}
        onAddSuggestionReply={noop}
        onToggleSuggestionReaction={noop}
      />,
    );

    await waitFor(() => {
      expect(
        container
          .querySelector(".docs-collab-review-floating-layer")
          ?.getAttribute("data-visibility-mode"),
      ).toBe("timeline");
    });

    expect(
      container.querySelector(".docs-collab-review-floating-layer__section--suggestions"),
    ).not.toBeNull();
    expect(
      container.querySelector(".docs-collab-review-floating-layer__section--comments"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".docs-collab-review-floating-layer__card--suggestion"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".docs-collab-review-floating-layer__card--comment"),
    ).toHaveLength(1);

    const stylesheet =
      document.getElementById(DOCS_COMMENT_VIEW_TIMELINE_STYLE_ID)?.textContent ?? "";
    expect(stylesheet).toContain(
      '.docs-collab-review-floating-layer[data-visibility-mode="timeline"] .docs-collab-review-floating-layer__card--suggestion[data-change-id="s-1"]{animation-timeline:--docs-sug-s-1;animation-range:entry 0% exit 100%;}',
    );

    editor.destroy();
  });
});
