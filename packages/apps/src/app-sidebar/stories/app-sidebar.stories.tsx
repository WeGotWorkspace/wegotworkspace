import type { Meta, StoryObj } from "@storybook/react-vite";
import { Folder } from "lucide-react";
import { Button } from "@/button/src/button";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { AppSidebar } from "../src/app-sidebar";
import { Pencil } from "lucide-react";

const meta: Meta<typeof AppSidebar> = {
  title: "Shared/App Sidebar",
  component: AppSidebar,
  parameters: {
    layout: "fullscreen",
    routerPath: "/mail",
  },
};

export default meta;
type Story = StoryObj<typeof AppSidebar>;

export const Default: Story = {
  args: {
    open: true,
    onCloseMobile: () => {},
    primaryButton: (
      <Button
        label="Compose"
        onClick={() => {}}
        size="lg"
        pill
        variant="primary"
        icon={<Pencil />}
        className="w-full"
      />
    ),
    children: (
      <SidebarSection
        title="Mailboxes"
        items={[
          {
            label: "Inbox",
            icon: <Folder className="size-3.5" />,
            selected: true,
            onClick: () => {},
          },
          { label: "Drafts", icon: <Folder className="size-3.5" />, onClick: () => {} },
        ]}
      />
    ),
    footer: <WorkspaceUserFooter name="Demo User" initials="DU" onLogoutClick={() => {}} />,
  },
};
