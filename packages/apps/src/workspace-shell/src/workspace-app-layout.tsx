import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AppButton } from "@/app-button/src/app-button";
import { SidebarLogo } from "@/sidebar-logo/src/sidebar-logo";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

type WorkspaceAppLayoutProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
};

type WorkspaceSidebarProps = {
  open: boolean;
  children: React.ReactNode;
};

type WorkspaceBrandHeaderProps = {
  onCloseMobile: () => void;
  showAppSwitcher?: boolean;
  appSwitcher?: React.ReactNode;
  closeButtonHoverClassName?: string;
};

type WorkspaceUserFooterProps = {
  name: string;
  initials: string;
  /** Optional second line (e.g. email) next to the avatar; when set, name/subtitle use `UserAvatar` layout. */
  detailLine?: string;
  onLogoutClick?: () => void;
  linkHoverClassName?: string;
};

type WorkspaceSidebarToggleProps = {
  open: boolean;
  onToggle: () => void;
  hoverClassName?: string;
};

export function WorkspaceAppLayout({ children, style, className }: WorkspaceAppLayoutProps) {
  return (
    <div
      className={cn("flex h-dvh w-full overflow-hidden relative notes-root", className)}
      style={{
        backgroundColor: "var(--workspace-root-bg, var(--color-cream, #f5f1e8))",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function WorkspaceSidebar({ open, children }: WorkspaceSidebarProps) {
  return (
    <aside
      data-open={open}
      className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[translate,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
        open
          ? "translate-x-0 w-72 md:w-64"
          : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
      }`}
      style={{
        backgroundColor:
          "var(--workspace-sidebar-bg, var(--color-paper, var(--color-cream, #f5f1e8)))",
        borderColor:
          "var(--workspace-sidebar-border-color, color-mix(in oklab, var(--color-ink) 15%, transparent))",
        color: "var(--workspace-sidebar-color, var(--color-ink))",
      }}
    >
      {children}
    </aside>
  );
}

export function WorkspaceBrandHeader({
  onCloseMobile,
  showAppSwitcher = true,
  appSwitcher,
  closeButtonHoverClassName = "hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)]",
}: WorkspaceBrandHeaderProps) {
  return (
    <SidebarLogo
      onCloseMobile={onCloseMobile}
      showAppSwitcher={showAppSwitcher}
      appSwitcher={appSwitcher}
      closeButtonHoverClassName={closeButtonHoverClassName}
    />
  );
}

export function WorkspaceUserFooter({
  name,
  initials,
  detailLine,
  onLogoutClick,
  linkHoverClassName = "hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]",
}: WorkspaceUserFooterProps) {
  const trimmedName = name.trim();
  const trimmedDetailLine = detailLine?.trim() ?? "";
  const trimmedInitials = initials.trim();
  const hasIdentity = trimmedName.length > 0 || trimmedDetailLine.length > 0;
  if (!hasIdentity) return null;
  const avatarName = trimmedName || trimmedInitials;
  const handleLogout = () => onLogoutClick?.();
  return (
    <div
      className="p-4 md:p-6 flex items-center gap-2 shrink-0 border-t"
      style={{
        color:
          "var(--workspace-user-footer-text-color, color-mix(in oklab, var(--color-ink) 70%, transparent))",
        borderColor:
          "var(--workspace-user-footer-border-color, color-mix(in oklab, var(--color-ink) 10%, transparent))",
      }}
    >
      <UserAvatar
        displayName={avatarName}
        subtitle={detailLine}
        compact={!detailLine}
        className={detailLine ? "flex-1 min-w-0" : "shrink-0"}
        // Keep avatar visuals themeable without pushing color props through component APIs.
        style={
          {
            ["--user-avatar-bg" as string]:
              "var(--workspace-user-footer-avatar-bg, color-mix(in oklab, var(--color-ink) 12%, transparent))",
            ["--user-avatar-fg" as string]:
              "var(--workspace-user-footer-avatar-color, var(--color-ink))",
            ["--user-avatar-label-color" as string]:
              "var(--workspace-user-footer-text-color, color-mix(in oklab, var(--color-ink) 70%, transparent))",
            ["--user-avatar-subtitle-color" as string]:
              "var(--workspace-user-footer-subtitle-color, color-mix(in oklab, var(--color-ink) 55%, transparent))",
          } as React.CSSProperties
        }
      />
      {!detailLine ? <div className="flex-1 min-w-0 text-sm truncate">{name}</div> : null}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AppButton
              icon={<LogOut className="size-4" />}
              ariaLabel="Log out"
              onClick={handleLogout}
              size="icon"
              variant="subtle"
              className={`size-9 rounded-full ${linkHoverClassName}`}
              style={{
                color:
                  "var(--workspace-user-footer-link-color, color-mix(in oklab, var(--color-ink) 65%, transparent))",
                backgroundColor:
                  "var(--workspace-user-footer-link-bg, color-mix(in oklab, var(--color-ink) 6%, transparent))",
              }}
            />
          </TooltipTrigger>
          <TooltipContent>Log out</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function WorkspaceSidebarScrim({ open, onClick }: { open: boolean; onClick: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300"
      onClick={onClick}
    />
  );
}

export function WorkspaceSidebarToggle({
  open,
  onToggle,
  hoverClassName = "hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]",
}: WorkspaceSidebarToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={open ? "Hide sidebar" : "Show sidebar"}
          onClick={onToggle}
          className={`size-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${hoverClassName}`}
          style={{
            color: "var(--workspace-sidebar-toggle-color, var(--color-ink))",
            backgroundColor:
              "var(--workspace-sidebar-toggle-bg, color-mix(in oklab, var(--color-ink) 6%, transparent))",
          }}
        >
          <Menu className="size-4 md:hidden" />
          {open ? (
            <PanelLeftClose className="size-4 hidden md:block" />
          ) : (
            <PanelLeftOpen className="size-4 hidden md:block" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{open ? "Hide sidebar" : "Show sidebar"}</TooltipContent>
    </Tooltip>
  );
}
