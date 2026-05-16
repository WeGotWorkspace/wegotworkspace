import type { Meta, StoryObj } from "@storybook/react-vite";
import { WeGotWorkspace } from "@/wegotworkspace/src/wegotworkspace";
import {
  WeGotWorkspaceLive,
  type WeGotWorkspaceLiveProps,
} from "@/wegotworkspace/src/wegotworkspace-live";

const defaultLiveApiBaseUrl =
  (import.meta.env.VITE_WGW_API_BASE_URL as string | undefined)?.trim() || "/api/v1";

const meta: Meta<typeof WeGotWorkspace> = {
  title: "Apps/WeGotWorkspace",
  component: WeGotWorkspace,
  parameters: {
    layout: "fullscreen",
    wegotworkspaceRouter: true,
  },
};

export default meta;
type Story = StoryObj<typeof WeGotWorkspace>;

export const Default: Story = {
  args: {
    initialPath: "/login",
  },
};

export const Installer: Story = {
  name: "Installer",
  args: {
    initialPath: "/install",
  },
};

export const LiveApi: StoryObj<WeGotWorkspaceLiveProps> = {
  name: "Live API",
  render: (args) => <WeGotWorkspaceLive {...args} />,
  args: {
    apiBaseUrl: defaultLiveApiBaseUrl,
    initialPath: "/login",
  },
  argTypes: {
    apiBaseUrl: { control: "text" },
  },
};
