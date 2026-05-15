import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAdminAppBootstrap } from "@/lib/api/mock/admin-bootstrap";
import { AdminWorkspace } from "@/admin-core/src/admin-workspace";

const meta: Meta<typeof AdminWorkspace> = {
  title: "Apps/Admin",
  component: AdminWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AdminWorkspace>;

export const Default: Story = {
  args: {
    ...createAdminAppBootstrap(),
  },
};
