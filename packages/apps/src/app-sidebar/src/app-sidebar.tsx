import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { AppSwitchButton } from "@/app-switch-button/src/app-switch-button";
import { cn } from "@/lib/utils";
import "@/app-sidebar/src/app-sidebar.css";

export type AppSidebarProps = {
  open: boolean;
  onCloseMobile: () => void;
  /** Main nav / section content (e.g. `SidebarSection` list). Padding and scroll live in the shell. */
  children: ReactNode;
  /** Pinned below the scroll region (e.g. `WorkspaceUserFooter`). */
  footer?: ReactNode;
  /** Primary CTA under the header (e.g. Compose, New). */
  primaryButton?: ReactNode;
  /** Applied to the scroll stack (primary button + sections), e.g. drive `--color-ink` override. */
  scrollSurfaceStyle?: CSSProperties;
  /** Passed to `AppSwitchButton` (e.g. install shell). */
  appSwitchDisabled?: boolean;
  appSwitchSubtitle?: string;
  className?: string;
};

export function AppSidebar({
  open,
  onCloseMobile,
  children,
  footer,
  primaryButton,
  scrollSurfaceStyle,
  appSwitchDisabled = false,
  appSwitchSubtitle,
  className,
}: AppSidebarProps) {
  return (
    <aside data-open={open ? "true" : "false"} className={cn("app-sidebar", className)}>
      <header className="app-sidebar__header">
        <div className="app-sidebar__header-main">
          <AppSwitchButton disabled={appSwitchDisabled} subtitle={appSwitchSubtitle} />
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="app-sidebar__close"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="app-sidebar__scroll">
        <div className="app-sidebar__scroll-surface" style={scrollSurfaceStyle}>
          {primaryButton != null ? (
            <div className="app-sidebar__primary-button">{primaryButton}</div>
          ) : null}
          <div className="app-sidebar__sections">{children}</div>
        </div>
      </div>

      {footer ? <footer className="app-sidebar__footer">{footer}</footer> : null}
    </aside>
  );
}

export function AppSidebarScrim({ open, onClick }: { open: boolean; onClick: () => void }) {
  if (!open) return null;
  return <div className="app-sidebar__scrim" onClick={onClick} />;
}
