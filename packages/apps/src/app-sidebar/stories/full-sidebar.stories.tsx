import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileEdit, Folder, Inbox, Mail, NotebookPen, Star, Tag } from "lucide-react";
import { AppButton } from "@/app-button/src/app-button";
import { SidebarLogo } from "@/sidebar-logo/src/sidebar-logo";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { StorybookAppSwitcherMock } from "@/storybook-app-switcher-mock/src/storybook-app-switcher-mock";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { AppSidebar } from "../src/app-sidebar";

const meta: Meta<typeof AppSidebar> = {
  title: "Shared/Sidebar",
  component: AppSidebar,
};

export default meta;
type Story = StoryObj;

export const MailWorkspaceSidebar: Story = {
  render: () => (
    <aside
      className="w-72 h-dvh flex flex-col border-r"
      style={{
        backgroundColor: "oklch(0.858745 0.15558 94.085)",
        borderColor: "color-mix(in oklab, var(--color-ink) 15%, transparent)",
        ["--sidebar-logo-brand-fill" as string]: "var(--color-ink)",
        ["--sidebar-logo-close-button-color" as string]: "var(--color-ink)",
        ["--workspace-user-footer-text-color" as string]:
          "color-mix(in oklab, var(--color-ink) 70%, transparent)",
        ["--workspace-user-footer-border-color" as string]:
          "color-mix(in oklab, var(--color-ink) 10%, transparent)",
        ["--workspace-user-footer-avatar-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 12%, transparent)",
        ["--workspace-user-footer-avatar-color" as string]: "var(--color-ink)",
        ["--workspace-user-footer-link-color" as string]:
          "color-mix(in oklab, var(--color-ink) 65%, transparent)",
        ["--workspace-user-footer-link-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 6%, transparent)",
      }}
    >
      <SidebarLogo
        showAppSwitcher
        appSwitcher={<StorybookAppSwitcherMock workspace="mail" />}
        onCloseMobile={() => {}}
      />

      <div className="px-4 mb-4">
        <AppButton
          label="Compose"
          icon={<FileEdit className="size-4" />}
          onClick={() => {}}
          size="pill"
          variant="primary"
        />
      </div>

      <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
        <SidebarSection
          items={[
            {
              label: "All Mail",
              icon: <Inbox className="size-3.5" />,
              badge: 12,
              selected: true,
              onClick: () => {},
            },
            {
              label: "Unread",
              icon: <Mail className="size-3.5" />,
              badge: 4,
              onClick: () => {},
            },
            {
              label: "Starred",
              icon: <Star className="size-3.5" />,
              badge: 2,
              onClick: () => {},
            },
          ]}
        />

        <SidebarSection
          title="Mailboxes"
          items={[
            { label: "Inbox", icon: <Inbox className="size-3.5" />, badge: 8, onClick: () => {} },
            { label: "Drafts", icon: <FileEdit className="size-3.5" />, onClick: () => {} },
            { label: "Archive", icon: <Folder className="size-3.5" />, onClick: () => {} },
          ]}
        />

        <SidebarSection
          title="Tags"
          onAdd={() => {}}
          addLabel="Add tag"
          items={[
            { label: "#priority", icon: <Tag className="size-3.5" />, onClick: () => {} },
            { label: "#follow-up", icon: <Tag className="size-3.5" />, onClick: () => {} },
          ]}
        />
      </nav>

      <WorkspaceUserFooter name="Elias Linden" initials="EL" onLogoutClick={() => {}} />
    </aside>
  ),
};

export const NotesWorkspaceSidebar: Story = {
  parameters: {
    routerPath: "/notes",
  },
  render: () => (
    <aside
      className="w-72 h-dvh flex flex-col border-r"
      style={{
        backgroundColor: "var(--color-paper)",
        borderColor: "color-mix(in oklab, var(--color-ink) 15%, transparent)",
        color: "var(--color-ink)",
        ["--sidebar-logo-brand-fill" as string]: "var(--color-ink)",
        ["--sidebar-logo-close-button-color" as string]: "var(--color-ink)",
        ["--workspace-user-footer-text-color" as string]:
          "color-mix(in oklab, var(--color-ink) 70%, transparent)",
        ["--workspace-user-footer-border-color" as string]:
          "color-mix(in oklab, var(--color-ink) 10%, transparent)",
        ["--workspace-user-footer-avatar-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 12%, transparent)",
        ["--workspace-user-footer-avatar-color" as string]: "var(--color-ink)",
        ["--workspace-user-footer-link-color" as string]:
          "color-mix(in oklab, var(--color-ink) 65%, transparent)",
        ["--workspace-user-footer-link-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 6%, transparent)",
      }}
    >
      <SidebarLogo
        showAppSwitcher
        appSwitcher={<StorybookAppSwitcherMock workspace="notes" />}
        onCloseMobile={() => {}}
      />

      <div className="px-4 mb-4">
        <AppButton
          label="New note"
          icon={<NotebookPen className="size-4" />}
          onClick={() => {}}
          size="pill"
          variant="primary"
        />
      </div>

      <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
        <SidebarSection
          items={[
            { label: "All Items", selected: true, onClick: () => {} },
            { label: "Starred", onClick: () => {} },
            { label: "Archive", onClick: () => {} },
          ]}
        />

        <SidebarSection
          title="Notebooks"
          onAdd={() => {}}
          addLabel="New notebook"
          items={[
            { label: "Personal", icon: <Folder className="size-3.5" />, onClick: () => {} },
            {
              label: "Work",
              icon: <Folder className="size-3.5" />,
              selected: true,
              onClick: () => {},
            },
          ]}
        />
      </nav>

      <WorkspaceUserFooter name="Elias Linden" initials="EL" onLogoutClick={() => {}} />
    </aside>
  ),
};
