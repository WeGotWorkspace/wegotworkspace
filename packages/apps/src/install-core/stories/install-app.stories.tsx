import type { Meta, StoryObj } from "@storybook/react-vite";
import { createInstallWorkspaceStoryArgs } from "@/lib/api/mock/install-bootstrap";
import { InstallWorkspace } from "@/install-core/src/install-workspace";

const meta: Meta<typeof InstallWorkspace> = {
  title: "Apps/Install",
  component: InstallWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof InstallWorkspace>;

export const Default: Story = {
  args: createInstallWorkspaceStoryArgs(),
};
