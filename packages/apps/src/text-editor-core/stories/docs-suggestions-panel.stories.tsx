import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { docsLabels } from "@/docs-core/src/docs-labels";
import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import { DocsSuggestionsPanel } from "@/text-editor-core/docs-collab/docs-suggestions";

import "@/text-editor-core/docs-collab/docs-suggestions-sidebar.css";

import { insertSuggestion, replaceSuggestion } from "./docs-suggestion-card.stories.fixtures";

const noop = () => {};

const panelHandlers = {
  onCloseMobile: noop,
  labels: docsLabels,
  onSelectSuggestion: noop,
  onAcceptSuggestion: noop,
  onRejectSuggestion: noop,
  onAcceptAll: noop,
  onRejectAll: noop,
};

const meta = {
  title: "Shared/TextEditor/Docs suggestions/Panel",
  component: DocsSuggestionsPanel,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Sidebar panel listing track-change suggestion cards. Isolated card variants (insert, delete, replace) live under Docs suggestions/Suggestion card.",
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
} satisfies Meta<typeof DocsSuggestionsPanel>;

export default meta;

type Story = StoryObj<typeof DocsSuggestionsPanel>;

export const Default: Story = {
  render: () => (
    <DocsSuggestionsPanel
      {...panelHandlers}
      suggestions={[replaceSuggestion, insertSuggestion]}
      activeChangeId="change-replace-1"
    />
  ),
};

export const Empty: Story = {
  render: () => <DocsSuggestionsPanel {...panelHandlers} suggestions={[]} activeChangeId={null} />,
};

function InteractivePanelDemo() {
  const [activeChangeId, setActiveChangeId] = useState<string | null>("change-replace-1");
  const [suggestions, setSuggestions] = useState<DocsTrackChangeGroup[]>([
    replaceSuggestion,
    insertSuggestion,
  ]);

  return (
    <DocsSuggestionsPanel
      {...panelHandlers}
      suggestions={suggestions}
      activeChangeId={activeChangeId}
      onSelectSuggestion={setActiveChangeId}
      onAcceptSuggestion={(changeId) => {
        setSuggestions((current) => current.filter((s) => s.changeId !== changeId));
        setActiveChangeId(null);
      }}
      onRejectSuggestion={(changeId) => {
        setSuggestions((current) => current.filter((s) => s.changeId !== changeId));
        setActiveChangeId(null);
      }}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractivePanelDemo />,
};
