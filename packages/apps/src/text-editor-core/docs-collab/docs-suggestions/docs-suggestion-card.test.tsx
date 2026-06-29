/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { insertSuggestion } from "@/text-editor-core/stories/docs-suggestion-card.stories.fixtures";
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
