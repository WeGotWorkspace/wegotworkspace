import type { Meta, StoryObj } from "@storybook/react-vite";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { DocsCollabReviewPanel } from "@/text-editor-core/docs-collab/docs-collab-review";

import { replaceSuggestion, insertSuggestion } from "./docs-suggestion-card.stories.fixtures";
import { sampleThread, threadWithReplies } from "./docs-comments-thread-card.stories.fixtures";

import "@/text-editor-core/docs-collab/docs-collab-review/docs-collab-review-panel.css";

const noop = () => {};

const panelHandlers = {
  editor: null,
  onCloseMobile: noop,
  labels: docsLabels,
  currentUserId: "u-1",
  activeThreadId: "thread-1",
  activeChangeId: "change-replace-1",
  onSelectThread: noop,
  onAddReply: noop,
  onToggleReaction: noop,
  onResolveThread: noop,
  onSelectSuggestion: noop,
  onAcceptSuggestion: noop,
  onRejectSuggestion: noop,
  onAddSuggestionReply: noop,
  onToggleSuggestionReaction: noop,
};

const meta = {
  title: "Shared/TextEditor/Docs collab/Review panel",
  component: DocsCollabReviewPanel,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Unified review sidebar mixing comment threads and track-change suggestions in document order.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[32rem] w-full max-w-sm border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocsCollabReviewPanel>;

export default meta;

type Story = StoryObj<typeof DocsCollabReviewPanel>;

export const Default: Story = {
  render: () => (
    <DocsCollabReviewPanel
      {...panelHandlers}
      threads={[sampleThread, threadWithReplies]}
      suggestions={[replaceSuggestion, insertSuggestion]}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <DocsCollabReviewPanel
      {...panelHandlers}
      threads={[]}
      suggestions={[]}
      activeThreadId={null}
      activeChangeId={null}
    />
  ),
};
