import type { ReactNode } from "react";
import type {
  AppSwitchButtonProps,
  AppSwitchButtonVariant,
} from "@/app-switch-button/src/app-switch-button";
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
  appSwitchVariant?: AppSwitchButtonVariant;
  /** Rendered beside the app switcher (e.g. open document name in Docs). */
  startAccessory?: ReactNode;
  /** Rendered on the right before the account chip (e.g. word count in Docs). */
  endAccessory?: ReactNode;
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
  /** When false, account chip omits the username line (e.g. compact Docs toolbar). */
  showAccountDetail?: boolean;
};

export function WorkspaceShellHeader({
  className,
  appSwitchDisabled = false,
  appSwitchSubtitle,
  appSwitchVariant,
  startAccessory,
  endAccessory,
  onAppSelect,
  session,
  displayName,
  onLogout,
  showUserAccount,
  showAccountDetail = true,
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
          variant={appSwitchVariant}
          onSelect={onAppSelect}
        />
        {startAccessory ? (
          <div className="workspace-shell-header__accessory">{startAccessory}</div>
        ) : null}
      </div>
      <div className="workspace-shell-header__end">
        {endAccessory ? (
          <div className="workspace-shell-header__end-accessory">{endAccessory}</div>
        ) : null}
        {accountVisible ? (
          <div className="workspace-shell-header__account">
            <WorkspaceUserFooter
              name={accountName}
              initials={workspaceUserInitials(session.user)}
              detailLine={showAccountDetail ? session.user.username : undefined}
              onLogoutClick={onLogout}
            />
          </div>
        ) : (
          <div className="workspace-shell-header__spacer" aria-hidden />
        )}
      </div>
    </header>
  );
}
