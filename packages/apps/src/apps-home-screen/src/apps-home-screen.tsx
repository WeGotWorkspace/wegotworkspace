import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { AppSwitchButton } from "@/app-switch-button/src/app-switch-button";
import { WorkspaceAppIcon } from "@/lib/workspace-app-icon";
import type { WorkspaceAppId } from "@/lib/workspace-app-icons";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import "@/apps-home-screen/src/apps-home-screen.css";

export type AppsHomeScreenItem = {
  id: string;
  label: string;
  /** Branded app tile when set (exact artwork from `/app-icons/`). */
  appId?: WorkspaceAppId;
  /** Lucide or custom node when neither `appId` nor `iconSrc` is set. */
  icon?: ReactNode;
  /** @deprecated Prefer `appId` — legacy PNG callers; manifests now use SVG via `appId`. */
  iconSrc?: string;
  accent: string;
  fg?: string;
  onSelect?: () => void;
};

type AppsHomeScreenProps = {
  apps: AppsHomeScreenItem[];
  className?: string;
  userDisplayName?: string;
  showUserMenu?: boolean;
  onLogout?: () => void;
};

/** Shared, presentational app home screen with a rounded icon grid. */
export function AppsHomeScreen({
  apps,
  className,
  userDisplayName = "User",
  showUserMenu = false,
  onLogout,
}: AppsHomeScreenProps) {
  return (
    <section className={cn("apps-home-screen w-full min-h-dvh", className)}>
      <header className="flex items-center justify-between p-6 md:p-8 shrink-0">
        <div className="flex min-w-0 items-center">
          <AppSwitchButton subtitle="Workspace" />
        </div>
        {showUserMenu ? (
          <HomeUserMenu displayName={userDisplayName} onLogout={onLogout} />
        ) : (
          <div className="size-9" aria-hidden />
        )}
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 pb-10 md:px-10 md:pb-14">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={app.onSelect}
              className="group flex w-full min-h-48 flex-col items-center justify-center gap-4 rounded-3xl p-3 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ink) focus-visible:ring-offset-2"
              aria-label={app.label}
            >
              {app.appId ? (
                <span className="apps-home-screen__tile-icon">
                  <WorkspaceAppIcon appId={app.appId} variant="tile" />
                </span>
              ) : app.iconSrc ? (
                <span className="apps-home-screen__tile-icon">
                  <img
                    src={app.iconSrc}
                    alt=""
                    className="workspace-app-icon--tile"
                    draggable={false}
                  />
                </span>
              ) : (
                <span
                  className="apps-home-screen__tile-icon--accent"
                  style={{ backgroundColor: app.accent, color: app.fg ?? "var(--color-ink)" }}
                >
                  <span className="text-current [&_svg]:size-12">{app.icon}</span>
                </span>
              )}
              <span className="text-sm font-medium text-white">{app.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeUserMenu({ displayName, onLogout }: { displayName: string; onLogout?: () => void }) {
  const initials = displayName
    .split(/\s+/)
    .map((segment) => segment[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="size-9 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
          style={{
            backgroundColor: "rgba(255,255,255,0.16)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
          aria-label="User menu"
        >
          {initials || "U"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{
          backgroundColor: "var(--color-paper, #ffffff)",
          color: "var(--color-ink)",
          borderColor: "color-mix(in oklab, var(--color-ink) 15%, transparent)",
        }}
      >
        <DropdownMenuItem className="text-xs opacity-60 focus:bg-transparent">
          {displayName}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
          <LogOut className="size-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
