import type { Meta, StoryObj } from "@storybook/react";
import * as ModuleExports from "../components/notes/note-list-item";

const meta: Meta = {
  title: "notes/note-list-item",
  parameters: {
    docs: {
      description: {
        component: "Auto-generated export inventory story for `note-list-item`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Exports: Story = {
  render: () => (
    <div style={{ minWidth: 320, maxWidth: 680 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>note-list-item</h3>
      <p style={{ marginBottom: 8 }}>Exported symbols in this module:</p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(Object.keys(ModuleExports), null, 2)}</pre>
    </div>
  ),
};
