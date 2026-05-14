import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidebarLogo } from "../src/sidebar-logo";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";

const meta: Meta<typeof SidebarLogo> = {
  title: "Shared/App Logo",
  component: SidebarLogo,
  parameters: {
    layout: "fullscreen",
    routerPath: "/mail",
  },
  decorators: [
    (Story) => (
      <div
        className="flex h-dvh w-64 shrink-0 flex-col border-r bg-[var(--color-paper)]"
        style={{
          borderColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarLogo>;

const logoArgs = {
  showAppSwitcher: true,
  onCloseMobile: () => {},
};

export const Default: Story = {
  args: {
    ...logoArgs,
    appSwitcher: <WorkspaceAppSwitcher />,
  },
};
