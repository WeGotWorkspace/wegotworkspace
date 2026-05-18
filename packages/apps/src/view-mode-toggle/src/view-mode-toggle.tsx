import { LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/view-mode-toggle/src/view-mode-toggle.css";

export type ViewMode = "grid" | "list";

export type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  gridLabel: string;
  listLabel: string;
  className?: string;
};

export function ViewModeToggle({
  value,
  onChange,
  gridLabel,
  listLabel,
  className,
}: ViewModeToggleProps) {
  return (
    <div className={cn("view-mode-toggle", className)} role="group" aria-label="View mode">
      <button
        type="button"
        aria-label={gridLabel}
        title={gridLabel}
        onClick={() => onChange("grid")}
        className={cn(
          "view-mode-toggle__button",
          value === "grid" && "view-mode-toggle__button--active",
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        aria-label={listLabel}
        title={listLabel}
        onClick={() => onChange("list")}
        className={cn(
          "view-mode-toggle__button",
          value === "list" && "view-mode-toggle__button--active",
        )}
      >
        <ListIcon className="size-4" />
      </button>
    </div>
  );
}
