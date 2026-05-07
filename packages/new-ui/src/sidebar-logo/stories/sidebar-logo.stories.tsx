import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidebarLogo } from "../src/sidebar-logo";
import { StorybookAppSwitcherMock } from "@/storybook-app-switcher-mock/src/storybook-app-switcher-mock";

const meta: Meta<typeof SidebarLogo> = {
  title: "Shared/Sidebar/Sidebar Logo",
  component: SidebarLogo,
};

export default meta;
type Story = StoryObj<typeof SidebarLogo>;

const logoArgs = {
  showAppSwitcher: true,
  onCloseMobile: () => {},
};

export const WithAppSwitcherMail: Story = {
  name: "With app switcher (Mail)",
  args: {
    ...logoArgs,
    appSwitcher: <StorybookAppSwitcherMock workspace="mail" />,
  },
};

export const WithAppSwitcherNotes: Story = {
  name: "With app switcher (Notes)",
  render: (args: ComponentProps<typeof SidebarLogo>) => (
    <div className="max-w-sm border rounded-lg overflow-hidden" style={{ backgroundColor: "var(--color-paper)" }}>
      <SidebarLogo {...args} />
    </div>
  ),
  args: {
    ...logoArgs,
    appSwitcher: <StorybookAppSwitcherMock workspace="notes" />,
  },
};

export const LogoOnly: Story = {
  args: {
    ...WithAppSwitcherMail.args,
    showAppSwitcher: false,
  },
};
