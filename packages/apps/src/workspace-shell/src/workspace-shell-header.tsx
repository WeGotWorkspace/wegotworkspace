import type { AppSwitchButtonProps } from "@/app-switch-button/src/app-switch-button";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import "@/workspace-shell/src/workspace-shell-header.css";

export type WorkspaceShellHeaderProps = {
  className?: string;
  /** Passed to `WorkspaceAppSwitcher` (e.g. login/install use `"Workspace"`). */
  appSwitchDisabled?: boolean;
  appSwitchSubtitle?: string;
  onAppSelect?: AppSwitchButtonProps["onSelect"];
  /** When set with `onLogout`, can render the header account chip (see `showUserAccount`). */
  session?: WorkspaceSession;
  /** Account chip title; defaults to `session.user.displayName`. */
  displayName?: string;
  onLogout?: () => void;
  /**
   * Header end slot: signed-in account footer. Defaults to true when both `session` and
   * `onLogout` are provided (meet guest join flow passes `false`).
   */
  showUserAccount?: boolean;
};

export function WorkspaceShellHeader({
  className,
  appSwitchDisabled = false,
  appSwitchSubtitle,
  onAppSelect,
  session,
  displayName,
  onLogout,
  showUserAccount,
}: WorkspaceShellHeaderProps) {
  const accountVisible =
    (showUserAccount ?? Boolean(session && onLogout)) && session != null && onLogout != null;
  const accountName = displayName ?? session?.user.displayName ?? "Guest";

  return (
    <header className={cn("workspace-shell-header", className)}>
      <div className="workspace-shell-header__start">
        <WorkspaceAppSwitcher
          disabled={appSwitchDisabled}
          subtitle={appSwitchSubtitle}
          onSelect={onAppSelect}
        />
      </div>
      {accountVisible ? (
        <div className="workspace-shell-header__account">
          <WorkspaceUserFooter
            name={accountName}
            initials={workspaceUserInitials(session.user)}
            detailLine={session.user.username}
            onLogoutClick={onLogout}
          />
        </div>
      ) : (
        <div className="workspace-shell-header__spacer" aria-hidden />
      )}
    </header>
  );
}
