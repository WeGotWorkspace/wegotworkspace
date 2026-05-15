import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminApp } from "@/admin-core/src/admin-app";

const meta: Meta<typeof AdminApp> = {
  title: "Apps/Admin",
  component: AdminApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/admin",
    docs: {
      description: {
        component:
          "Uses mock admin data and in-memory API when `wgwLiveApiEnabled()` is false (typical Storybook). Server checks are pre-filled in mock bootstrap. **Refresh checks** on the Server checks card only re-fetches state (no full update check). **Check for updates** runs a simulated release check. For real HTTP behavior, see **Apps/Admin/Live API**.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AdminApp>;

export const Mock: Story = {
  render: () => <AdminApp />,
};
