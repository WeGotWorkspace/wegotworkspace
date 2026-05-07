import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotesUI } from "@/notes-ui/src/notes-ui";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { notesSeedDataFromWgwSamples } from "@/lib/api/mock/notes-wgw-story-seed";
import { notesStoryLabels } from "../src/notes-app.stories.fixtures";

const meta: Meta<typeof NotesUI> = {
  title: "Apps/Notes/Full App",
  component: NotesUI,
  parameters: {
    layout: "fullscreen",
    routerPath: "/notes",
  },
};

export default meta;
type Story = StoryObj<typeof NotesUI>;

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
