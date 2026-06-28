import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { docsLabels } from "@/docs-core/src/docs-labels";
import type { DocsCommentThread } from "@/text-editor-core/docs-collab/docs-comments-types";
import {
  DocsCommentsPanel,
  DocsCommentsReply,
  DocsCommentsSidebar,
  DocsCommentsThreadCard,
} from "@/text-editor-core/docs-collab/docs-comments";

import "@/text-editor-core/docs-collab/docs-comments-sidebar.css";

const noop = () => {};

const sampleThread: DocsCommentThread = {
  id: "thread-1",
  anchorText: "launch checklist",
  anchorFrom: 1,
  createdAt: "2026-06-01T09:00:00.000Z",
  createdBy: { id: "u-1", name: "Alex Example" },
  resolved: false,
  messages: [
    {
      id: "thread-1-m",
      body: "Can we tighten the acceptance criteria before Friday?",
      createdAt: "2026-06-01T09:05:00.000Z",
      author: { id: "u-1", name: "Alex Example" },
    },
  ],
  reactions: [{ emoji: "👍", userIds: ["u-2"] }],
};

const threadWithReplies: DocsCommentThread = {
  ...sampleThread,
  id: "thread-2",
  messages: [
    sampleThread.messages[0],
    {
      id: "thread-2-r1",
      body: "Yes — I'll add the QA pass to the doc.",
      createdAt: "2026-06-01T10:15:00.000Z",
      author: { id: "u-2", name: "Sam Lee" },
    },
  ],
};

const draftThread: DocsCommentThread = {
  id: "draft-1",
  anchorText: "selected phrase",
  anchorFrom: 1,
  anchorTo: 16,
  createdAt: "2026-06-01T11:00:00.000Z",
  createdBy: { id: "u-1", name: "Alex Example" },
  resolved: false,
  messages: [],
};

const panelHandlers = {
  onCloseMobile: noop,
  labels: docsLabels,
  currentUserId: "u-1",
  onSelectThread: noop,
  onAddReply: noop,
  onToggleReaction: noop,
  onResolveThread: noop,
  onDeleteThread: noop,
};

const meta = {
  title: "Shared/TextEditor/Docs comments/Panel",
  component: DocsCommentsPanel,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Mobile drawer and sidebar panel listing comment threads.",
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
} satisfies Meta<typeof DocsCommentsPanel>;

export default meta;

type Story = StoryObj<typeof DocsCommentsPanel>;

export const Default: Story = {
  render: () => (
    <DocsCommentsPanel
      {...panelHandlers}
      threads={[sampleThread, threadWithReplies]}
      activeThreadId="thread-1"
    />
  ),
};

export const Empty: Story = {
  render: () => <DocsCommentsPanel {...panelHandlers} threads={[]} activeThreadId={null} />,
};

export const WithDraft: Story = {
  render: () => (
    <DocsCommentsPanel
      {...panelHandlers}
      threads={[sampleThread]}
      draftThread={draftThread}
      activeThreadId="draft-1"
      onCancelDraft={noop}
    />
  ),
};

export const SidebarAlias: Story = {
  name: "Sidebar (deprecated alias)",
  render: () => (
    <DocsCommentsSidebar {...panelHandlers} threads={[sampleThread]} activeThreadId="thread-1" />
  ),
};

export const ThreadCardActive: Story = {
  name: "Thread card / active",
  render: () => (
    <div className="max-w-sm p-4">
      <DocsCommentsThreadCard
        thread={threadWithReplies}
        labels={docsLabels}
        currentUserId="u-1"
        active
        onSelect={noop}
        onAddReply={noop}
        onToggleReaction={noop}
        onResolve={noop}
        onDelete={noop}
      />
    </div>
  ),
};

export const ThreadCardDraft: Story = {
  name: "Thread card / draft",
  render: () => (
    <div className="max-w-sm p-4">
      <DocsCommentsThreadCard
        thread={draftThread}
        labels={docsLabels}
        currentUserId="u-1"
        active
        onSelect={noop}
        onAddReply={noop}
        onToggleReaction={noop}
        onResolve={noop}
        onDelete={noop}
        onCancelDraft={noop}
      />
    </div>
  ),
};

export const Reply: Story = {
  render: () => (
    <div className="max-w-sm p-4">
      <DocsCommentsReply message={threadWithReplies.messages[1]!} />
    </div>
  ),
};

function InteractivePanelDemo() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>("thread-1");
  const [threads, setThreads] = useState<DocsCommentThread[]>([sampleThread, threadWithReplies]);

  return (
    <DocsCommentsPanel
      {...panelHandlers}
      threads={threads}
      activeThreadId={activeThreadId}
      onSelectThread={setActiveThreadId}
      onAddReply={(threadId, body) => {
        setThreads((current) =>
          current.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: [
                    ...thread.messages,
                    {
                      id: `${threadId}-reply-${thread.messages.length}`,
                      body,
                      createdAt: new Date().toISOString(),
                      author: { id: "u-1", name: "Alex Example" },
                    },
                  ],
                }
              : thread,
          ),
        );
      }}
      onResolveThread={(threadId) => {
        setThreads((current) => current.filter((thread) => thread.id !== threadId));
        setActiveThreadId(null);
      }}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractivePanelDemo />,
};
