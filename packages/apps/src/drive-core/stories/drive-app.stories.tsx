import type { Meta, StoryObj } from "@storybook/react-vite";
import { DriveApp } from "@/drive-core/src/drive-app";

const meta: Meta<typeof DriveApp> = {
  title: "Apps/Drive",
  component: DriveApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/drive",
  },
};

export default meta;
type Story = StoryObj<typeof DriveApp>;

export const Default: Story = {
  render: () => <DriveApp />,
};
