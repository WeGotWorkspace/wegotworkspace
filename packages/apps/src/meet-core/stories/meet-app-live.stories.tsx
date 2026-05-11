import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetApp } from "@/meet-core/src/meet-app";

/**
 * Uses the real WeGotWorkspace Voice API (`/voice/*`) through Storybook's `/api/v1` proxy.
 */
const meta: Meta<typeof MeetApp> = {
  title: "Apps/Meet/Live API",
  component: MeetApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/meet",
  },
};

export default meta;
type Story = StoryObj<typeof MeetApp>;

export const FromWeGotWorkspace: Story = {
  render: () => <MeetApp />,
};
