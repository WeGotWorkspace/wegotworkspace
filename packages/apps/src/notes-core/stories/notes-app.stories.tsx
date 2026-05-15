import type { Meta, StoryObj } from "@storybook/react-vite";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { notesSeedDataFromWgwSamples } from "@/lib/api/mock/notes-wgw-story-seed";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";

const meta: Meta<typeof NotesWorkspace> = {
  title: "Apps/Notes",
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
    ...createNotesAppBootstrap(),
  },
};

/** Rows mapped from `WgwNoteItem` (`GET /notes/items`) per `packages/api/openapi/openapi.json`. */
export const FromOpenApiShapes: Story = {
  args: {
    ...createNotesAppBootstrap({ data: notesSeedDataFromWgwSamples() }),
  },
};
