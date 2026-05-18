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
  className?: string;
};

export function PathBreadcrumb({ items, onNavigate, className }: PathBreadcrumbProps) {
  return (
    <nav className={cn("path-breadcrumb", className)} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCurrent = isLast || !item.path;

        return (
          <span key={`${item.label}-${index}`} className="path-breadcrumb__segment">
            {index > 0 ? <ChevronRight className="path-breadcrumb__separator" /> : null}
            {isCurrent ? (
              <span className="path-breadcrumb__current">{item.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => item.path && onNavigate?.(item.path)}
                className="path-breadcrumb__link"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
