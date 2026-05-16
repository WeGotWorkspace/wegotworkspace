import { Download, Share2, Star, Trash2 } from "lucide-react";
import { ActionBar } from "@/action-bar/src/action-bar";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

type DriveDetailActionBarProps = {
  labels: DriveUILabels;
  isStarred: boolean;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  onStar: () => void;
  onDelete: () => void;
  mobile?: boolean;
};

export function DriveDetailActionBar({
  labels,
  isStarred,
  onClose,
  onDownload,
  onShare,
  onStar,
  onDelete,
  mobile,
}: DriveDetailActionBarProps) {
  const rightActions = [
    {
      id: "download",
      label: labels.detailDownload,
      onClick: onDownload,
      icon: <Download />,
    },
    {
      id: "share",
      label: labels.detailShare,
      onClick: onShare,
      icon: <Share2 />,
    },
    {
      id: "star",
      label: isStarred ? labels.detailUnstar : labels.detailStar,
      onClick: onStar,
      active: isStarred,
      icon: <Star />,
    },
    {
      id: "delete",
      label: labels.detailDelete,
      onClick: onDelete,
      icon: <Trash2 />,
    },
  ];

  return (
    <ActionBar
      onBack={onClose}
      backLabel={mobile ? "Back" : "Close"}
      rightActions={rightActions}
      className="drive-detail-actions px-4 md:px-6 h-14 md:h-16 border-b shrink-0"
    />
  );
}
