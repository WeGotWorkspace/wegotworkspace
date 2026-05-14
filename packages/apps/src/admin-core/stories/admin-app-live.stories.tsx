import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminApp } from "@/admin-core/src/admin-app";

/**
 * Hits the real WeGotWorkspace HTTP API (via Storybook's `/api/v1` proxy).
 * Uses `/admin/state`, `/admin/settings`, and `/admin/updates/*`.
 */
const meta: Meta<typeof AdminApp> = {
  title: "Apps/Admin/Live API",
  component: AdminApp,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AdminApp>;

export const FromWeGotWorkspace: Story = {
  render: () => <AdminApp />,
};
