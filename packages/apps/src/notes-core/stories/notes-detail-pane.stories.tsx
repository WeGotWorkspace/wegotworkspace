import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
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

  return (
    <NotesStoryScope variant="detail">
      <NoteDetailView
        noteId={base.noteId}
        notebook={base.notebook}
        lastEdited={base.lastEdited}
        editedLabel={base.editedLabel}
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
    const editor = canvasElement.querySelector('[contenteditable="true"]');
    expect(editor).toBeTruthy();
    await userEvent.click(editor!);
    await userEvent.type(editor!, " Updated body text");
    await waitFor(() => {
      expect(editor!.textContent).toMatch(/Updated body text/);
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
