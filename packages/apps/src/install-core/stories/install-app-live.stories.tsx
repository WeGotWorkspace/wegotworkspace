import type { Meta, StoryObj } from "@storybook/react-vite";
import { InstallApp } from "@/install-core/src/install-app";

/**
 * Hits the real WeGotWorkspace installer API (via Storybook `/api/v1` proxy).
 */
const meta: Meta<typeof InstallApp> = {
  title: "Apps/Install/Live API",
  component: InstallApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/install",
  },
};

export default meta;
type Story = StoryObj<typeof InstallApp>;

export const FromWeGotWorkspace: Story = {
  render: () => <InstallApp />,
};
