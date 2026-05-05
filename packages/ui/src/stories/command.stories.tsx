import type { Meta, StoryObj } from "@storybook/react";
import * as ModuleExports from "../components/ui/command";

const meta: Meta = {
  title: "ui/command",
  parameters: {
    docs: {
      description: {
        component: "Auto-generated export inventory story for `command`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Exports: Story = {
  render: () => (
    <div style={{ minWidth: 320, maxWidth: 680 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>command</h3>
      <p style={{ marginBottom: 8 }}>Exported symbols in this module:</p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(Object.keys(ModuleExports), null, 2)}</pre>
    </div>
  ),
};
