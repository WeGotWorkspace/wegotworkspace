import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { NoteDetailView } from "@/note-detail-view/src/note-detail-view";
import { getNotesDetailStoryProps } from "./notes-pane-stories.fixtures";
import { NotesStoryScope } from "./notes-story-scope";

function NotesDetailPaneHarness({
  readOnly = false,
  withPullQuote = false,
  tallBody = false,
}: {
  readOnly?: boolean;
  withPullQuote?: boolean;
  tallBody?: boolean;
}) {
  const base = getNotesDetailStoryProps({
    extraBody: tallBody,
    pullQuote: withPullQuote ? "A highlighted line for layout checks." : undefined,
  });
  const [title, setTitle] = useState(base.title);

  return (
    <NotesStoryScope variant="detail">
      <NoteDetailView
        noteId={base.noteId}
        notebook={base.notebook}
        lastEdited={base.lastEdited}
        editedLabel={base.editedLabel}
        title={title}
        onTitleChange={readOnly ? undefined : setTitle}
        tags={base.tags}
        readOnly={readOnly}
        pullQuote={base.pullQuote}
        body={base.body}
      />
    </NotesStoryScope>
  );
}

const meta = {
  title: "Apps/Notes/Panes/Detail",
  component: NotesDetailPaneHarness,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NotesDetailPaneHarness>;

export default meta;
type Story = StoryObj<typeof NotesDetailPaneHarness>;

export const Editable: Story = {
  tags: ["vitest-ci"],
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByRole("heading", { name: /Architecture of Quiet/i });
    await userEvent.clear(title);
    await userEvent.type(title, "Updated note title");
    await waitFor(() => {
      expect(title).toHaveTextContent("Updated note title");
    });
  },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

export const WithPullQuote: Story = {
  args: { withPullQuote: true },
};

export const TallScroll: Story = {
  args: { tallBody: true },
};
