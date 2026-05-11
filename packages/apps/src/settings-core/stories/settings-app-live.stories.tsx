import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsApp } from "@/settings-core/src/settings-app";

/**
 * Hits the real WeGotWorkspace HTTP API (via Storybook's `/api/v1` proxy).
 * Uses `/settings/state`, `/settings/profile`, and `/settings/mail`.
 */
const meta: Meta<typeof SettingsApp> = {
  title: "Apps/Settings/Live API",
  component: SettingsApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/settings",
  },
};

export default meta;
type Story = StoryObj<typeof SettingsApp>;

export const FromWeGotWorkspace: Story = {
  render: () => <SettingsApp />,
};
