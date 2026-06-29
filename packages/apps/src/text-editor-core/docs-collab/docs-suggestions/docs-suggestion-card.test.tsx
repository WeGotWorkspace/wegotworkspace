/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { docsLabels } from "@/docs-core/src/docs-labels";
import {
  formatChangeSuggestion,
  insertSuggestion,
  longReplaceSuggestion,
} from "@/text-editor-core/stories/docs-suggestion-card.stories.fixtures";
import { DocsSuggestionCard } from "./docs-suggestion-card";

import "./docs-suggestion-card.css";

afterEach(() => {
  cleanup();
});

const noop = () => {};

describe("DocsSuggestionCard", () => {
  it("shows the reply composer when the card is active", () => {
    render(
      <DocsSuggestionCard
        suggestion={insertSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    expect(screen.getByLabelText(docsLabels.commentsReplyPlaceholder)).toBeTruthy();
    expect(screen.getByRole("button", { name: docsLabels.commentsReplyAction })).toBeTruthy();
  });

  it("hides the reply composer when the card is inactive", () => {
    render(
      <DocsSuggestionCard
        suggestion={insertSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active={false}
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    expect(screen.queryByLabelText(docsLabels.commentsReplyPlaceholder)).toBeNull();
  });

  it("marks inactive cards and wraps diff content for two-line clamping", () => {
    const { container } = render(
      <DocsSuggestionCard
        suggestion={longReplaceSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active={false}
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    const card = container.querySelector(".docs-collab-card");
    const diff = screen.getByLabelText(longReplaceSuggestion.summary);
    const clamp = diff.querySelector(".docs-collab-card__clamp");

    expect(card?.getAttribute("data-active")).toBe("false");
    expect(clamp).toBeTruthy();
    expect(clamp?.querySelector(".docs-collab-highlight--deletion")).toBeTruthy();
    expect(clamp?.querySelector(".docs-collab-highlight--insertion")).toBeTruthy();
  });

  it("does not mark active cards as inactive", () => {
    const { container } = render(
      <DocsSuggestionCard
        suggestion={longReplaceSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    expect(container.querySelector(".docs-collab-card")?.getAttribute("data-active")).toBe("true");
  });

  it("shows affected text for format-change suggestions, not format mark names", () => {
    render(
      <DocsSuggestionCard
        suggestion={formatChangeSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active={false}
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    const diff = screen.getByLabelText(formatChangeSuggestion.summary);
    expect(diff.textContent).toContain("headline");
    expect(diff.textContent).not.toContain("italic");
    expect(diff.textContent).not.toContain("bold");
  });

  it("renders format-change diff with removed and added mark styling", () => {
    render(
      <DocsSuggestionCard
        suggestion={formatChangeSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active={false}
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    const diff = screen.getByLabelText(formatChangeSuggestion.summary);
    const before = diff.querySelector(".docs-collab-highlight__format-before");
    const after = diff.querySelector(".docs-collab-highlight__format-after");
    const arrow = diff.querySelector(".docs-suggestion-card__diff-arrow");

    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(arrow).toBeTruthy();
    expect(before?.textContent).toBe("headline");
    expect(after?.textContent).toBe("headline");
    expect(before?.classList.contains("docs-collab-highlight__format-mark--italic")).toBe(true);
    expect(after?.classList.contains("docs-collab-highlight__format-mark--bold")).toBe(true);
  });

  it("renders plain before and formatted after when only formatAdded is set", () => {
    const addBoldOnly = {
      ...formatChangeSuggestion,
      parts: [
        {
          ...formatChangeSuggestion.parts[0]!,
          formatAdded: "bold",
          formatRemoved: undefined,
        },
      ],
    };

    render(
      <DocsSuggestionCard
        suggestion={addBoldOnly}
        labels={docsLabels}
        currentUserId="u-1"
        active={false}
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={noop}
        onToggleReaction={noop}
      />,
    );

    const diff = screen.getByLabelText(addBoldOnly.summary);
    const before = diff.querySelector(".docs-collab-highlight__format-before");
    const after = diff.querySelector(".docs-collab-highlight__format-after");
    const arrow = diff.querySelector(".docs-suggestion-card__diff-arrow");

    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(arrow).toBeTruthy();
    expect(before?.textContent).toBe("headline");
    expect(after?.textContent).toBe("headline");
    expect(before?.classList.contains("docs-collab-highlight__format-mark--bold")).toBe(false);
    expect(after?.classList.contains("docs-collab-highlight__format-mark--bold")).toBe(true);
  });

  it("calls onAddReply when posting a reply", () => {
    const onAddReply = vi.fn();
    render(
      <DocsSuggestionCard
        suggestion={insertSuggestion}
        labels={docsLabels}
        currentUserId="u-1"
        active
        onSelect={noop}
        onAccept={noop}
        onReject={noop}
        onAddReply={onAddReply}
        onToggleReaction={noop}
      />,
    );

    const input = screen.getByLabelText(docsLabels.commentsReplyPlaceholder);
    fireEvent.change(input, { target: { value: "Follow-up note" } });
    fireEvent.click(screen.getByRole("button", { name: docsLabels.commentsReplyAction }));

    expect(onAddReply).toHaveBeenCalledWith("Follow-up note");
  });
});
