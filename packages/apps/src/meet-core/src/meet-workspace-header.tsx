import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";

type MeetWorkspaceHeaderProps = {
  session: WorkspaceSession;
  displayName: string;
  disableAppSwitcher: boolean;
  showUserAccount: boolean;
  onLogout?: () => void;
};

export function MeetWorkspaceHeader({
  session,
  displayName,
  disableAppSwitcher,
  showUserAccount,
  onLogout,
}: MeetWorkspaceHeaderProps) {
  return (
    <header className="meet-workspace__header">
      <div className="meet-workspace__header-start">
        <WorkspaceAppSwitcher disabled={disableAppSwitcher} />
      </div>
      {showUserAccount && onLogout ? (
        <div className="meet-workspace__header-account">
          <WorkspaceUserFooter
            name={displayName}
            initials={workspaceUserInitials(session.user)}
            detailLine={session.user.username}
            onLogoutClick={onLogout}
          />
        </div>
      ) : (
        <div className="meet-workspace__header-spacer" aria-hidden />
      )}
    </header>
  );
}
