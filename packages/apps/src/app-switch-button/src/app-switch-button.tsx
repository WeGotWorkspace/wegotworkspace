import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  HardDrive,
  Mail as MailIcon,
  NotebookPen,
  Settings as SettingsIcon,
  Shield,
  Video,
} from "lucide-react";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";
import type { DropdownMenuItemProps } from "@/menu-dropdown/src/dropdown-menu";
import { BrandMark } from "@/brand-mark/src/brand-mark";
import { cn } from "@/lib/utils";
import "@/app-switch-button/src/app-switch-button.css";

const TAGLINE = "we got";

const WORKSPACE_APPS = [
  {
    id: "notes",
    label: "Notes",
    icon: NotebookPen,
    to: "/notes",
  },
  {
    id: "mail",
    label: "Mail",
    icon: MailIcon,
    to: "/mail",
  },
  {
    id: "drive",
    label: "Drive",
    icon: HardDrive,
    to: "/drive",
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    to: "/settings",
  },
  {
    id: "meet",
    label: "Meet",
    icon: Video,
    to: "/meet",
  },
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    to: "/admin",
  },
] as const;

export type AppSwitchButtonProps = {
  disabled?: boolean;
  /** When set (e.g. `Workspace` on home/install), overrides the subtitle inferred from the route. */
  subtitle?: string;
  onSelect?: (app: (typeof WORKSPACE_APPS)[number]) => void;
};

export function AppSwitchButton({
  disabled = false,
  subtitle: subtitleProp,
  onSelect: onSelectProp,
}: AppSwitchButtonProps) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const current =
    WORKSPACE_APPS.find((a) => path === a.to || path.startsWith(`${a.to}/`)) ?? WORKSPACE_APPS[0];
  const subtitle = subtitleProp ?? current.label;
  const menuSurfaceKey = subtitleProp === "Workspace" ? "workspace" : current.id;
  const onSelect =
    onSelectProp ??
    ((app: (typeof WORKSPACE_APPS)[number]) => {
      void navigate({ to: app.to });
    });

  const menuItems: DropdownMenuItemProps[] = WORKSPACE_APPS.map((app) => {
    const Icon = app.icon;
    return {
      id: app.id,
      label: app.label,
      icon: <Icon className="size-4" />,
      checked: app.id === current.id,
      onClick: () => {
        if (disabled) return;
        onSelect?.(app);
      },
    };
  });

  return (
    <DropdownMenu
      trigger={
        <button type="button" disabled={disabled} className="app-switch-button__trigger">
          <BrandMark className="app-switch-button__brand" />
          <span className="app-switch-button__label">
            <span className="app-switch-button__label-top">{TAGLINE}</span>
            <span>{subtitle}</span>
          </span>
          {!disabled ? (
            <span className="app-switch-button__chevron-stack">
              <span aria-hidden />
              <ChevronDown className="app-switch-button__chevron" aria-hidden />
            </span>
          ) : null}
        </button>
      }
      items={menuItems}
      disabled={disabled}
      contentClassName={cn("app-switch-button__menu", `app-switch-button__menu--${menuSurfaceKey}`)}
    />
  );
}
