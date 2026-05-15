import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NoteDetailView } from "@/note-detail-view/src/note-detail-view";
import { getNotesDetailStoryProps } from "./notes-pane-stories.fixtures";
import { notesDetailPaneDecorator } from "./notes-panes.stories.decorator";

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
  const [body, setBody] = useState(base.body);

  return (
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
      body={body}
      onBodyParagraphChange={
        readOnly
          ? undefined
          : (index, value) => {
              setBody((prev) => {
                const next = [...prev];
                next[index] = value;
                return next;
              });
            }
      }
    />
  );
}

const meta = {
  title: "Apps/Notes/Panes/Detail",
  component: NotesDetailPaneHarness,
  decorators: [notesDetailPaneDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NotesDetailPaneHarness>;

export default meta;
type Story = StoryObj<typeof NotesDetailPaneHarness>;

export const Editable: Story = {
  args: {},
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
