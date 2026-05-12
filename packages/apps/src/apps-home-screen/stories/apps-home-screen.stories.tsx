import type { Meta, StoryObj } from "@storybook/react-vite";
import { HardDrive, Mail as MailIcon, NotebookPen, Settings as SettingsIcon, Shield, Video } from "lucide-react";
import { AppsHomeScreen } from "../src/apps-home-screen";

const meta: Meta<typeof AppsHomeScreen> = {
  title: "Shared/Apps Home Screen",
  component: AppsHomeScreen,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AppsHomeScreen>;

export const Default: Story = {
  args: {
    showUserMenu: true,
    userDisplayName: "Elias Linden",
    onLogout: () => {},
    apps: [
      {
        id: "notes",
        label: "Notes",
        icon: <NotebookPen className="size-4" />,
        accent: "var(--color-paper)",
        fg: "var(--color-ink)",
      },
      {
        id: "mail",
        label: "Mail",
        icon: <MailIcon className="size-4" />,
        accent: "var(--mail-sidebar, #f2ce42)",
        fg: "var(--color-ink)",
      },
      {
        id: "drive",
        label: "Drive",
        icon: <HardDrive className="size-4" />,
        accent: "var(--drive-sidebar, #0c8397)",
        fg: "#ffffff",
      },
      {
        id: "settings",
        label: "Settings",
        icon: <SettingsIcon className="size-4" />,
        accent: "var(--settings-sidebar, #da9fb8)",
        fg: "var(--color-ink)",
      },
      {
        id: "meet",
        label: "Meet",
        icon: <Video className="size-4" />,
        accent: "#4f7cff",
        fg: "#ffffff",
      },
      {
        id: "admin",
        label: "Admin",
        icon: <Shield className="size-4" />,
        accent: "#2f302c",
        fg: "#ffffff",
      },
    ],
  },
};
