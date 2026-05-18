import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/path-breadcrumb/src/path-breadcrumb.css";

export type PathBreadcrumbItem = {
  label: string;
  path?: string | null;
};

export type PathBreadcrumbProps = {
  items: PathBreadcrumbItem[];
  onNavigate?: (path: string) => void;
  /** Active location; matching crumbs render as current (non-link). */
  currentPath?: string | null;
  /** Paths that stay clickable even when they match {@link currentPath}. */
  alwaysNavigablePaths?: string[];
  className?: string;
  leadingIcon?: ReactNode;
  /** Compact density for dialogs and narrow panes. */
  size?: "default" | "sm";
};

export function PathBreadcrumb({
  items,
  onNavigate,
  currentPath,
  alwaysNavigablePaths,
  className,
  leadingIcon,
  size = "default",
}: PathBreadcrumbProps) {
  return (
    <nav
      className={cn("path-breadcrumb", size === "sm" && "path-breadcrumb--sm", className)}
      aria-label="Breadcrumb"
    >
      {leadingIcon ? (
        <span className="path-breadcrumb__lead" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <div className="path-breadcrumb__trail">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasPath = item.path != null;
          const isCurrent =
            item.path == null ||
            (currentPath !== undefined
              ? item.path === currentPath &&
                !alwaysNavigablePaths?.includes(item.path)
              : isLast);

          return (
            <span key={`${item.label}-${index}`} className="path-breadcrumb__segment">
              {index > 0 ? <ChevronRight className="path-breadcrumb__separator" /> : null}
              {isCurrent ? (
                <span className="path-breadcrumb__current">{item.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => hasPath && onNavigate?.(item.path!)}
                  className="path-breadcrumb__link"
                >
                  {item.label}
                </button>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
