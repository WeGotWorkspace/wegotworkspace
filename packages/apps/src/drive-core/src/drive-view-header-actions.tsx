import { Info, Trash2 } from "lucide-react";
import { ActionBar, type ActionBarAction } from "@/action-bar/src/action-bar";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

type DriveViewHeaderActionsProps = {
  labels: DriveUILabels;
  detailOpen: boolean;
  onToggleDetail: () => void;
  inTrashView: boolean;
  hasVisibleItems: boolean;
  onEmptyTrash: () => void;
};

export function DriveViewHeaderActions({
  labels,
  detailOpen,
  onToggleDetail,
  inTrashView,
  hasVisibleItems,
  onEmptyTrash,
}: DriveViewHeaderActionsProps) {
  const rightActions: ActionBarAction[] = [
    {
      id: "toggle-details",
      label: detailOpen ? labels.hideDetails : labels.showDetails,
      onClick: onToggleDetail,
      icon: <Info />,
    },
  ];

  if (inTrashView && hasVisibleItems) {
    rightActions.push({
      id: "empty-trash",
      label: labels.emptyTrash,
      onClick: onEmptyTrash,
      icon: <Trash2 />,
    });
  }

  return (
    <div className="drive-view-header-actions">
      <ActionBar rightActions={rightActions} />
    </div>
  );
}
