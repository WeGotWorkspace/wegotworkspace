import type { Meta, StoryObj } from "@storybook/react-vite";
import { DriveApp } from "@/drive-core/src/drive-app";
import { DriveWorkspace } from "@/routes/drive";

function DriveStoryApp() {
  return <DriveApp renderWorkspace={(props) => <DriveWorkspace {...props} />} />;
}

const meta: Meta<typeof DriveStoryApp> = {
  title: "Apps/Drive",
  component: DriveStoryApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/drive",
  },
};

export default meta;
type Story = StoryObj<typeof DriveStoryApp>;

export const Mock: Story = {
  render: () => <DriveStoryApp />,
};
