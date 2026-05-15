import type { Meta, StoryObj } from "@storybook/react-vite";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";

const meta: Meta<typeof NotesWorkspace> = {
  title: "Apps/Notes",
  component: NotesWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof NotesWorkspace>;

export const Default: Story = {
  args: {
    ...createNotesAppBootstrap(),
  },
};
