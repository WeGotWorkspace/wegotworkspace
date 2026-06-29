import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import "./docs-collab-sidebar-panel.css";

export type DocsCollabSidebarPanelProps = {
  className?: string;
  ariaLabel: string;
  title: string;
  countLabel: string;
  closeLabel: string;
  onClose: () => void;
  headerActions?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
  empty?: boolean;
  emptyLabel?: string;
  listClassName?: string;
  children: ReactNode;
};

export function DocsCollabSidebarPanel({
  className,
  ariaLabel,
  title,
  countLabel,
  closeLabel,
  onClose,
  headerActions,
  scrollRef,
  empty = false,
  emptyLabel,
  listClassName = "docs-collab-sidebar-panel__list",
  children,
}: DocsCollabSidebarPanelProps) {
  return (
    <aside
      className={className ? `docs-collab-sidebar-panel ${className}` : "docs-collab-sidebar-panel"}
      aria-label={ariaLabel}
    >
      <header className="docs-collab-sidebar-panel__header">
        <div className="docs-collab-sidebar-panel__header-main">
          <p className="docs-collab-sidebar-panel__label">{title}</p>
          <p className="docs-collab-sidebar-panel__count">{countLabel}</p>
        </div>
        <div className="docs-collab-sidebar-panel__header-actions">
          {headerActions}
          <button
            type="button"
            className="docs-collab-sidebar-panel__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="docs-collab-sidebar-panel__scroll">
        {empty && emptyLabel ? (
          <p className="docs-collab-sidebar-panel__empty">{emptyLabel}</p>
        ) : (
          <div className={listClassName}>{children}</div>
        )}
      </div>
    </aside>
  );
}
