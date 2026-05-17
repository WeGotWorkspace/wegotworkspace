import { LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

type DriveViewModeToggleProps = {
  labels: DriveUILabels;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
};

export function DriveViewModeToggle({ labels, viewMode, onViewModeChange }: DriveViewModeToggleProps) {
  return (
    <div className="drive-view-mode-toggle hidden sm:flex items-center rounded-full p-0.5" role="group" aria-label="View mode">
      <button
        type="button"
        aria-label={labels.gridView}
        title={labels.gridView}
        onClick={() => onViewModeChange("grid")}
        className={cn(
          "drive-view-mode-button size-8 rounded-full flex items-center justify-center transition-colors",
          viewMode === "grid" && "drive-view-mode-button--active",
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        aria-label={labels.listView}
        title={labels.listView}
        onClick={() => onViewModeChange("list")}
        className={cn(
          "drive-view-mode-button size-8 rounded-full flex items-center justify-center transition-colors",
          viewMode === "list" && "drive-view-mode-button--active",
        )}
      >
        <ListIcon className="size-4" />
      </button>
    </div>
  );
}
