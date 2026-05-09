import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidebarLogo } from "../src/sidebar-logo";
import { StorybookAppSwitcherMock } from "@/storybook-app-switcher-mock/src/storybook-app-switcher-mock";

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
  name: "Default",
  args: {
    ...logoArgs,
    appSwitcher: <StorybookAppSwitcherMock workspace="mail" />,
  },
};