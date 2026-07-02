import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { AppsHomeScreen, type AppsHomeScreenItem } from "@/apps-home-screen/src/apps-home-screen";
import {
  WORKSPACE_APP_ACCENT,
  workspaceAppIconSrc,
  type WorkspaceAppId,
} from "@/lib/workspace-app-icons";
import {
  fetchWeGotWorkspaceHomeState,
  MOCK_HOME_STATE,
  type WeGotWorkspaceHomeState,
} from "@/wegotworkspace/src/wegotworkspace-home-state";
import { useWeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-story-logout";

function homeAppTile(
  appId: WorkspaceAppId,
  label: string,
  onSelect: () => void,
  fg?: string,
): AppsHomeScreenItem {
  return {
    id: appId,
    label,
    iconSrc: workspaceAppIconSrc(appId),
    accent: WORKSPACE_APP_ACCENT[appId],
    fg,
    onSelect,
  };
}

export function WeGotWorkspaceLiveHome() {
  const navigate = useNavigate();
  const onLogout = useWeGotWorkspaceLogout();
  const [homeState, setHomeState] = useState<WeGotWorkspaceHomeState>(MOCK_HOME_STATE);

  useEffect(() => {
    let cancelled = false;
    void fetchWeGotWorkspaceHomeState().then((next) => {
      if (!cancelled) setHomeState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const apps: AppsHomeScreenItem[] = [
    homeAppTile("notes", "Notes", () => void navigate({ to: "/notes" })),
    homeAppTile("mail", "Mail", () => void navigate({ to: "/mail" })),
    ...(homeState.showContacts
      ? [homeAppTile("contacts", "Contacts", () => void navigate({ to: "/contacts" }), "#ffffff")]
      : []),
    homeAppTile("drive", "Drive", () => void navigate({ to: "/drive" }), "#ffffff"),
    homeAppTile("docs", "Docs", () => void navigate({ to: "/docs" }), "#ffffff"),
    homeAppTile("settings", "Settings", () => void navigate({ to: "/settings" })),
    homeAppTile("meet", "Meet", () => void navigate({ to: "/meet" }), "#ffffff"),
    homeAppTile("admin", "Admin", () => void navigate({ to: "/admin" }), "#ffffff"),
    ...homeState.pluginAppTiles.map((tile) => ({
      id: tile.id,
      label: tile.label,
      icon: <FileText className="size-4" />,
      accent: WORKSPACE_APP_ACCENT.drive,
      fg: "#ffffff",
      onSelect: () => {
        window.location.assign(tile.route);
      },
    })),
  ];

  return (
    <AppsHomeScreen
      apps={homeState.showAdmin ? apps : apps.filter((app) => app.id !== "admin")}
      className="min-h-dvh"
      userDisplayName={homeState.userDisplayName}
      showUserMenu={homeState.showUserMenu}
      onLogout={onLogout}
    />
  );
}
