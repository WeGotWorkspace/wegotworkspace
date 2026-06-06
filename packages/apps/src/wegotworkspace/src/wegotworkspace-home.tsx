import { useNavigate } from "@tanstack/react-router";
import {
  FileText,
  HardDrive,
  Mail as MailIcon,
  NotebookPen,
  Settings as SettingsIcon,
  Shield,
  Video,
} from "lucide-react";
import { AppsHomeScreen, type AppsHomeScreenItem } from "@/apps-home-screen/src/apps-home-screen";
import { useWeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-story-logout";

export function WeGotWorkspaceHome() {
  const navigate = useNavigate();
  const onLogout = useWeGotWorkspaceLogout();

  const apps: AppsHomeScreenItem[] = [
    {
      id: "notes",
      label: "Notes",
      icon: <NotebookPen className="size-4" />,
      accent: "var(--notes-sidebar, #fcd34d)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/notes" }),
    },
    {
      id: "mail",
      label: "Mail",
      icon: <MailIcon className="size-4" />,
      accent: "var(--mail-sidebar, #d9254f)",
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
      id: "docs",
      label: "Docs",
      icon: <FileText className="size-4" />,
      accent: "#0d9488",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/docs" }),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon className="size-4" />,
      accent: "var(--settings-sidebar, #949dad)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/settings" }),
    },
    {
      id: "meet",
      label: "Meet",
      icon: <Video className="size-4" />,
      accent: "#4f7cff",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/meet" }),
    },
    {
      id: "admin",
      label: "Admin",
      icon: <Shield className="size-4" />,
      accent: "var(--admin-sidebar, #4a5059)",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/admin" }),
    },
  ];

  return (
    <AppsHomeScreen
      apps={apps}
      className="min-h-dvh"
      userDisplayName="Demo User"
      showUserMenu
      onLogout={onLogout}
    />
  );
}
