import type { Meta, StoryObj } from "@storybook/react-vite";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { DocsSuggestionCard } from "@/text-editor-core/docs-collab/docs-suggestions";

import {
  deleteSuggestion,
  formatChangeSuggestion,
  insertSuggestion,
  replaceSuggestion,
} from "./docs-suggestion-card.stories.fixtures";

const noop = () => {};

const cardHandlers = {
  labels: docsLabels,
  onSelect: noop,
  onAccept: noop,
  onReject: noop,
};

const meta = {
  title: "Shared/TextEditor/Docs suggestions/Suggestion card",
  component: DocsSuggestionCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Standalone track-change suggestion card. Insert, delete, replace, and format-change fixtures mirror getDocsTrackChangeGroups output; each card shows a tinted Tag (Inserted, Deleted, Replaced, Format changed) above an inline diff (green insertions, red strikethrough deletions). Panel stories live under Docs suggestions/Panel.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocsSuggestionCard>;

export default meta;

type Story = StoryObj<typeof DocsSuggestionCard>;

export const Insert: Story = {
  render: () => <DocsSuggestionCard {...cardHandlers} suggestion={insertSuggestion} active />,
};

export const InsertInactive: Story = {
  name: "Insert / inactive",
  render: () => (
    <DocsSuggestionCard {...cardHandlers} suggestion={insertSuggestion} active={false} />
  ),
};

export const Delete: Story = {
  render: () => <DocsSuggestionCard {...cardHandlers} suggestion={deleteSuggestion} active />,
};

export const DeleteInactive: Story = {
  name: "Delete / inactive",
  render: () => (
    <DocsSuggestionCard {...cardHandlers} suggestion={deleteSuggestion} active={false} />
  ),
};

export const Replace: Story = {
  render: () => <DocsSuggestionCard {...cardHandlers} suggestion={replaceSuggestion} active />,
};

export const ReplaceInactive: Story = {
  name: "Replace / inactive",
  render: () => (
    <DocsSuggestionCard {...cardHandlers} suggestion={replaceSuggestion} active={false} />
  ),
};

export const FormatChange: Story = {
  name: "Format change",
  render: () => <DocsSuggestionCard {...cardHandlers} suggestion={formatChangeSuggestion} active />,
};
