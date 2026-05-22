import { Download, FolderInput, Pencil, Star, Trash2, MoreHorizontal } from "lucide-react";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import { IconButton } from "@/button/src/button";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

export type DriveFileActionCallbacks = {
  onDownload: () => void;
  onStar: () => void;
  onDelete: () => void;
  onRename?: () => void;
  onMove?: () => void;
};

export function buildDriveFileActions(
  labels: DriveUILabels,
  options: {
    isStarred: boolean;
    inTrash: boolean;
    canDownload?: boolean;
    canMove?: boolean;
  },
  callbacks: DriveFileActionCallbacks,
): ActionBarAction[] {
  const actions: ActionBarAction[] = [];

  if (options.canDownload !== false) {
    actions.push({
      id: "download",
      label: labels.detailDownload,
      onClick: callbacks.onDownload,
      icon: <Download />,
    });
  }

  actions.push({
    id: "star",
    label: options.isStarred ? labels.detailUnstar : labels.detailStar,
    onClick: callbacks.onStar,
    active: options.isStarred,
    icon: <Star />,
  });

  if (callbacks.onRename) {
    actions.push({
      id: "rename",
      label: labels.detailRename,
      onClick: callbacks.onRename,
      icon: <Pencil />,
    });
  }

  if (options.canMove !== false && callbacks.onMove) {
    actions.push({
      id: "move",
      label: labels.detailMove,
      onClick: callbacks.onMove,
      icon: <FolderInput />,
    });
  }

  actions.push({
    id: "delete",
    label: options.inTrash ? labels.selectionDeletePermanently : labels.detailDelete,
    onClick: callbacks.onDelete,
    icon: <Trash2 />,
  });

  return actions;
}

export function DriveFileItemActionsMenu({ actions }: { actions: ActionBarAction[] }) {
  return (
    <DropdownMenu
      align="end"
      sideOffset={6}
      contentClassName="min-w-40"
      items={actions.map((action) => ({
        id: action.id,
        label: action.label,
        icon: action.icon,
        onClick: action.onClick,
        checked: action.active,
        className:
          action.id === "delete"
            ? "cursor-pointer gap-2.5 text-red-600 focus:text-red-600"
            : "cursor-pointer gap-2.5",
      }))}
      trigger={
        <IconButton
          label="More actions"
          icon={<MoreHorizontal />}
          size="sm"
          variant="subtle"
          showTooltip={false}
          onClick={(event) => event.stopPropagation()}
        />
      }
    />
  );
}
