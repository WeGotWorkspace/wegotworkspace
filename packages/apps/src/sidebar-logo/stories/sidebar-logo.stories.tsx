import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidebarLogo } from "../src/sidebar-logo";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";

const meta: Meta<typeof SidebarLogo> = {
  title: "Shared/App Logo",
  component: SidebarLogo,
};

export default meta;
type Story = StoryObj<typeof SidebarLogo>;

const logoArgs = {
  showAppSwitcher: true,
  onCloseMobile: () => {},
};

export const Default: Story = {
  parameters: {
    routerPath: "/mail",
  },
  args: {
    ...logoArgs,
    appSwitcher: <WorkspaceAppSwitcher />,
  },
};
