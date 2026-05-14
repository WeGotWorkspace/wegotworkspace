import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { ListHeader } from "@/list-header/src/list-header";
import { useSettingsController } from "@/settings-core/src/use-settings-controller";
import type { SettingsWorkspaceProps } from "@/settings-core/src/settings-workspace-props";
import { SettingsMailPane } from "@/settings-core/src/settings-mail-pane";
import { SettingsMembershipsPane } from "@/settings-core/src/settings-memberships-pane";
import { SettingsProfilePane } from "@/settings-core/src/settings-profile-pane";
import { cn } from "@/lib/utils";
import "@/settings-core/src/settings-workspace.css";

export function SettingsWorkspace(props: SettingsWorkspaceProps) {
  const { data, session, operations, className, onLogout } = props;
  const controller = useSettingsController({ data, operations });
  const sidebarItems = controller.sections.map((candidate) => ({
    label: candidate.label,
    icon: candidate.icon,
    selected: controller.section === candidate.id,
    onClick: () => controller.selectSection(candidate.id),
  }));

  return (
    <WorkspaceAppLayout
      className={cn("settings-workspace", className)}
      sidebar={
        <AppSidebar
          open={controller.sidebarOpen}
          onCloseMobile={() => controller.setSidebarOpen(false)}
          footer={
            <WorkspaceUserFooter
              name={session.user.displayName}
              initials={workspaceUserInitials(session.user)}
              detailLine={session.user.username}
              onLogoutClick={onLogout}
            />
          }
        >
          <SidebarSection title="Account" items={sidebarItems} />
        </AppSidebar>
      }
      mainHeader={
        <ListHeader
          title={controller.currentSection.label}
          subtitle={controller.currentSection.description}
          sidebarOpen={controller.sidebarOpen}
          onToggleSidebar={() => controller.setSidebarOpen((value) => !value)}
        />
      }
      main={
        <>
          {controller.section === "profile" ? (
            <SettingsProfilePane profile={controller.profile} />
          ) : null}
          {controller.section === "memberships" ? (
            <SettingsMembershipsPane groups={controller.memberships} />
          ) : null}
          {controller.section === "mail" ? <SettingsMailPane mail={controller.mail} /> : null}
        </>
      }
    />
  );
}
