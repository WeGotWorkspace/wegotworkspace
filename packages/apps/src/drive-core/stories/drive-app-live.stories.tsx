import type { Meta, StoryObj } from "@storybook/react-vite";
import { DriveApp } from "@/drive-core/src/drive-app";
import { DriveWorkspace } from "@/routes/drive";

/**
 * Hits the real WeGotWorkspace HTTP API (via Storybook's `/api/v1` proxy).
 * Uses `/drive/user`, `/drive/getdir`, `/drive/searchfiles`, and drive mutations.
 */
function DriveLiveStoryApp() {
  return <DriveApp renderWorkspace={(props) => <DriveWorkspace {...props} />} />;
}

const meta: Meta<typeof DriveLiveStoryApp> = {
  title: "Apps/Drive/Live API",
  component: DriveLiveStoryApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/drive",
  },
};

export default meta;
type Story = StoryObj<typeof DriveLiveStoryApp>;

export const FromWeGotWorkspace: Story = {
  render: () => <DriveLiveStoryApp />,
};
