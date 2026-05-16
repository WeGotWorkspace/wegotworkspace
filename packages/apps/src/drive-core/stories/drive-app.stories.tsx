import type { Meta, StoryObj } from "@storybook/react-vite";
import { createDriveAppBootstrap } from "@/lib/api/mock/drive-bootstrap";
import { DriveWorkspace } from "@/drive-core/src/drive-workspace";

const meta: Meta<typeof DriveWorkspace> = {
  title: "Apps/Drive",
  component: DriveWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof DriveWorkspace>;

export const Default: Story = {
  args: {
    ...createDriveAppBootstrap(),
    onLogout: () => {},
  },
};
