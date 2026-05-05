import type { Meta, StoryObj } from "@storybook/react";
import * as ModuleExports from "../components/ui/textarea";

const meta: Meta = {
  title: "ui/textarea",
  parameters: {
    docs: {
      description: {
        component: "Auto-generated export inventory story for `textarea`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Exports: Story = {
  render: () => (
    <div style={{ minWidth: 320, maxWidth: 680 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>textarea</h3>
      <p style={{ marginBottom: 8 }}>Exported symbols in this module:</p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(Object.keys(ModuleExports), null, 2)}</pre>
    </div>
  ),
};
