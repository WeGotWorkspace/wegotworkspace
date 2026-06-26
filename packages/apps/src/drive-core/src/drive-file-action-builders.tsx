import { Download, FolderInput, Pencil, Share2, Star, Trash2 } from "lucide-react";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

export type DriveFileActionCallbacks = {
  onDownload: () => void;
  onStar: () => void;
  onDelete: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onShare?: () => void;
};

export function buildDriveFileActions(
  labels: DriveUILabels,
  options: {
    isStarred: boolean;
    inTrash: boolean;
    canDownload?: boolean;
    canMove?: boolean;
    canShare?: boolean;
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

  if (options.canShare !== false && callbacks.onShare) {
    actions.push({
      id: "share",
      label: labels.detailShare,
      onClick: callbacks.onShare,
      icon: <Share2 />,
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
