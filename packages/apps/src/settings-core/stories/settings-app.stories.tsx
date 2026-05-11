import type { Meta, StoryObj } from "@storybook/react-vite";
import { createSettingsAppBootstrap } from "@/lib/api/mock/settings-bootstrap";
import { SettingsWorkspace } from "@/settings-core/src/settings-workspace";

const meta: Meta<typeof SettingsWorkspace> = {
  title: "Apps/Settings/Full App",
  component: SettingsWorkspace,
  parameters: {
    layout: "fullscreen",
    routerPath: "/settings",
  },
};

export default meta;
type Story = StoryObj<typeof SettingsWorkspace>;

export const Default: Story = {
  args: {
    logoutTo: false,
    ...createSettingsAppBootstrap(),
  },
};
