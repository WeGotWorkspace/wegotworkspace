import type { Meta, StoryObj } from "@storybook/react-vite";
import { WeGotWorkspace } from "@/wegotworkspace/src/wegotworkspace";

const meta: Meta<typeof WeGotWorkspace> = {
  title: "Apps/WeGotWorkspace",
  component: WeGotWorkspace,
  parameters: {
    layout: "fullscreen",
    wegotworkspaceRouter: true,
  },
};

export default meta;
type Story = StoryObj<typeof WeGotWorkspace>;

export const Default: Story = {
  args: {
    initialPath: "/login",
  },
};

export const Installer: Story = {
  name: "Installer",
  args: {
    initialPath: "/install",
  },
};
