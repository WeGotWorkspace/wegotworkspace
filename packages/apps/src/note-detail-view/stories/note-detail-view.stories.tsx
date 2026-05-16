import type { Meta, StoryObj } from "@storybook/react-vite";
import { NoteDetailView } from "../src/note-detail-view";

const meta: Meta<typeof NoteDetailView> = {
  title: "Apps/Notes/Note Detail View",
  component: NoteDetailView,
  decorators: [
    (Story) => (
      <div
        className="max-w-3xl mx-auto p-8 rounded-lg border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NoteDetailView>;

const base = {
  noteId: "demo-1",
  notebook: "Personal",
  lastEdited: "6 May 2026",
  title: "Shared detail layout",
  tags: ["ideas", "draft"],
  body: ["First paragraph of the note.", "Second paragraph with more detail."],
  onTitleChange: () => {},
  onTagAdd: () => {},
  onTagRemove: () => {},
  onBodyMarkdownChange: () => {},
};

export const Editable: Story = {
  args: {
    ...base,
    readOnly: false,
    pullQuote: "A quote pulled from the body.",
  },
};

export const ReadOnly: Story = {
  args: {
    ...base,
    readOnly: true,
    title: "Read-only preview",
    pullQuote: undefined,
  },
};
