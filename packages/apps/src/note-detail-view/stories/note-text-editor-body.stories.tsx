import type { Meta, StoryObj } from "@storybook/react-vite";
import { NoteTextEditorBody } from "../src/note-text-editor-body";

const sampleMarkdown = `# Weekly sync

First paragraph with **bold** and _italic_ text.

- Action item one
- Action item two

> Pull quote from the meeting notes.
`;

const meta: Meta<typeof NoteTextEditorBody> = {
  title: "Apps/Notes/Components/TextEditorBody",
  component: NoteTextEditorBody,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div
        className="note-detail-view"
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--color-cream, #ffffff)",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div className="mx-auto max-w-2xl">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NoteTextEditorBody>;

export const Default: Story = {
  args: {
    noteId: "demo-1",
    initialMarkdown: sampleMarkdown,
  },
};

export const ReadOnly: Story = {
  args: {
    noteId: "demo-readonly",
    initialMarkdown: sampleMarkdown,
    readOnly: true,
  },
};
