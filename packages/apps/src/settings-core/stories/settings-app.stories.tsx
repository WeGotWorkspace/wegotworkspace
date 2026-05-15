import type { Meta, StoryObj } from "@storybook/react-vite";
import { createSettingsAppBootstrap } from "@/lib/api/mock/settings-bootstrap";
import { SettingsWorkspace } from "@/settings-core/src/settings-workspace";

const meta: Meta<typeof SettingsWorkspace> = {
  title: "Apps/Settings",
  component: SettingsWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SettingsWorkspace>;

export const Default: Story = {
  args: {
    ...createSettingsAppBootstrap(),
  },
};
