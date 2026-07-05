import { Columns2, LayoutGrid, List as ListIcon } from "lucide-react";
import { SegmentedControl } from "@/segmented-control/src/segmented-control";
import type { DriveViewMode } from "@/drive-core/src/drive-view-mode";

export type DriveViewModeToggleProps = {
  value: DriveViewMode;
  onChange: (mode: DriveViewMode) => void;
  gridLabel: string;
  listLabel: string;
  columnLabel: string;
  className?: string;
  size?: "sm" | "md";
};

export function DriveViewModeToggle({
  value,
  onChange,
  gridLabel,
  listLabel,
  columnLabel,
  className,
  size = "sm",
}: DriveViewModeToggleProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      size={size}
      className={className}
      aria-label="View mode"
      options={[
        { value: "grid", label: gridLabel, icon: <LayoutGrid className="size-4" /> },
        { value: "list", label: listLabel, icon: <ListIcon className="size-4" /> },
        { value: "column", label: columnLabel, icon: <Columns2 className="size-4" /> },
      ]}
    />
  );
}
