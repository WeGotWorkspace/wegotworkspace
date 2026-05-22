import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  HardDrive,
  Mail as MailIcon,
  NotebookPen,
  Settings as SettingsIcon,
  Shield,
  Video,
} from "lucide-react";
import { AppsHomeScreen, type AppsHomeScreenItem } from "@/apps-home-screen/src/apps-home-screen";
import {
  fetchWeGotWorkspaceHomeState,
  MOCK_HOME_STATE,
  type WeGotWorkspaceHomeState,
} from "@/wegotworkspace/src/wegotworkspace-home-state";
import { useWeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-story-logout";

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
    {
      id: "notes",
      label: "Notes",
      icon: <NotebookPen className="size-4" />,
      accent: "var(--notes-sidebar, #fde047)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/notes" }),
    },
    {
      id: "mail",
      label: "Mail",
      icon: <MailIcon className="size-4" />,
      accent: "var(--mail-sidebar, #f2ce42)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/mail" }),
    },
    {
      id: "drive",
      label: "Drive",
      icon: <HardDrive className="size-4" />,
      accent: "var(--drive-sidebar, #2563eb)",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/drive" }),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon className="size-4" />,
      accent: "var(--settings-sidebar, #da9fb8)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/settings" }),
    },
    {
      id: "meet",
      label: "Meet",
      icon: <Video className="size-4" />,
      accent: "#4f7cff",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/voice" }),
    },
    {
      id: "admin",
      label: "Admin",
      icon: <Shield className="size-4" />,
      accent: "#2f302c",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/admin" }),
    },
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
