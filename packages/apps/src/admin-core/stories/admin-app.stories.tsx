import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminApp } from "@/admin-core/src/admin-app";

const meta: Meta<typeof AdminApp> = {
  title: "Apps/Admin",
  component: AdminApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/admin",
  },
};

export default meta;
type Story = StoryObj<typeof AdminApp>;

export const Mock: Story = {
  render: () => <AdminApp />,
};
