import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { notesSeedDataFromWgwSamples } from "@/lib/api/mock/notes-wgw-story-seed";
import { notesStoryLabels } from "@/notes-core/src/notes-app.stories.fixtures";

const meta: Meta<typeof NotesWorkspace> = {
  title: "Apps/Notes/Full App",
  component: NotesWorkspace,
  parameters: {
    layout: "fullscreen",
    routerPath: "/notes",
  },
};

export default meta;
type Story = StoryObj<typeof NotesWorkspace>;

export const Default: Story = {
  args: {
    logoutTo: false,
    ...createNotesAppBootstrap(),
    labels: notesStoryLabels,
  },
};

/** Rows mapped from `WgwNoteItem` (`GET /notes/items`) per `packages/api/openapi/openapi.json`. */
export const FromOpenApiShapes: Story = {
  args: {
    logoutTo: false,
    ...createNotesAppBootstrap({ data: notesSeedDataFromWgwSamples() }),
    labels: notesStoryLabels,
  },
};
