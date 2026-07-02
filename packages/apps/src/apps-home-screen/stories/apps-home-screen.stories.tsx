import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppsHomeScreen } from "../src/apps-home-screen";
import { WORKSPACE_APP_ACCENT, workspaceAppIconSrc } from "@/lib/workspace-app-icons";

const meta: Meta<typeof AppsHomeScreen> = {
  title: "Shared/Apps Home Screen",
  component: AppsHomeScreen,
  parameters: {
    layout: "fullscreen",
    routerPath: "/",
  },
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
        iconSrc: workspaceAppIconSrc("notes"),
        accent: WORKSPACE_APP_ACCENT.notes,
      },
      {
        id: "mail",
        label: "Mail",
        iconSrc: workspaceAppIconSrc("mail"),
        accent: WORKSPACE_APP_ACCENT.mail,
      },
      {
        id: "drive",
        label: "Drive",
        iconSrc: workspaceAppIconSrc("drive"),
        accent: WORKSPACE_APP_ACCENT.drive,
        fg: "#ffffff",
      },
      {
        id: "settings",
        label: "Settings",
        iconSrc: workspaceAppIconSrc("settings"),
        accent: WORKSPACE_APP_ACCENT.settings,
      },
      {
        id: "meet",
        label: "Meet",
        iconSrc: workspaceAppIconSrc("meet"),
        accent: WORKSPACE_APP_ACCENT.meet,
        fg: "#ffffff",
      },
      {
        id: "admin",
        label: "Admin",
        iconSrc: workspaceAppIconSrc("admin"),
        accent: WORKSPACE_APP_ACCENT.admin,
        fg: "#ffffff",
      },
    ],
  },
};
