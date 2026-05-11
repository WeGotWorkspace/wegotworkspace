import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  HardDrive,
  Mail as MailIcon,
  NotebookPen,
  Settings as SettingsIcon,
  Shield,
  Video,
} from "lucide-react";

import { AppSwitcher } from "@/app-switcher/src/app-switcher";

const WORKSPACE_APPS = [
  {
    id: "notes",
    label: "Notes",
    to: "/notes",
    icon: NotebookPen,
    accent: "var(--color-paper)",
    fg: "var(--color-ink)",
  },
  {
    id: "mail",
    label: "Mail",
    to: "/mail",
    icon: MailIcon,
    accent: "var(--mail-sidebar, #f2ce42)",
    fg: "var(--color-ink)",
  },
  {
    id: "drive",
    label: "Drive",
    to: "/drive",
    icon: HardDrive,
    accent: "var(--drive-sidebar, #0c8397)",
    fg: "#ffffff",
  },
  {
    id: "settings",
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    accent: "var(--settings-sidebar, #da9fb8)",
    fg: "var(--color-ink)",
  },
  {
    id: "meet",
    label: "Meet",
    to: "/meet",
    icon: Video,
    accent: "#4f7cff",
    fg: "#ffffff",
  },
  {
    id: "admin",
    label: "Admin",
    to: "/admin",
    icon: Shield,
    accent: "#2f302c",
    fg: "#ffffff",
  },
] as const;

/** Wires the default workspace app list and router to the presentational `AppSwitcher`. */
export function WorkspaceAppSwitcher({ disabled = false }: { disabled?: boolean }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const current = WORKSPACE_APPS.find((a) => path.startsWith(a.to)) ?? WORKSPACE_APPS[0];

  return (
    <AppSwitcher
      subtitle={current.label}
      disabled={disabled}
      items={WORKSPACE_APPS.map((app) => {
        const Icon = app.icon;
        return {
          id: app.id,
          label: app.label,
          icon: <Icon className="size-4" />,
          checked: app.id === current.id,
          onSelect: () => {
            if (disabled) return;
            void navigate({ to: app.to });
          },
        };
      })}
      menuContentClassName="min-w-[12rem] p-1.5"
      menuContentStyle={{
        backgroundColor: current.accent,
        color: current.fg,
        borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
      }}
    />
  );
}
