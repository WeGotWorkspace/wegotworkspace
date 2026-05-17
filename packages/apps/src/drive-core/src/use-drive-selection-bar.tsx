import { useMemo } from "react";
import { Download, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceSelectionPresentation } from "@/hooks/use-workspace-list-controller";
import type { WorkspaceActionButton } from "@/hooks/workspace-list-controller-types";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { DriveFile } from "@/drive-core/src/drive-models";

type UseDriveSelectionBarArgs = {
  labels: DriveUILabels;
  files: DriveFile[];
  selectedIds: string[];
  selectionMode: boolean;
  activeId: string | null;
  inTrashView: boolean;
  operations?: DriveAPIOperations;
  exitSelection: () => void;
  batchStar: () => void;
  requestDeleteSelected: () => void;
};

export function useDriveSelectionBar({
  labels,
  files,
  selectedIds,
  selectionMode,
  activeId,
  inTrashView,
  operations,
  exitSelection,
  batchStar,
  requestDeleteSelected,
}: UseDriveSelectionBarArgs) {
  const selectionActionButtons = useMemo<WorkspaceActionButton[]>(
    () => [
      {
        label: labels.selectionStar,
        icon: <Star className="size-4" />,
        onClick: batchStar,
      },
      {
        label: labels.selectionDownload,
        icon: <Download className="size-4" />,
        onClick: () => {
          const first = files.find(
            (file) => selectedIds.includes(file.id) && file.kind !== "folder",
          );
          if (operations && first?.apiPath) {
            void operations.downloadFile(first.apiPath).catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error);
              toast.error(message);
            });
          }
          toast("Download started", { icon: <Download className="size-4" /> });
        },
      },
      {
        label: inTrashView ? labels.selectionDeletePermanently : labels.selectionMoveToTrash,
        icon: <Trash2 className="size-4" />,
        onClick: requestDeleteSelected,
      },
    ],
    [
      batchStar,
      files,
      inTrashView,
      labels.selectionDeletePermanently,
      labels.selectionDownload,
      labels.selectionMoveToTrash,
      labels.selectionStar,
      operations,
      requestDeleteSelected,
      selectedIds,
    ],
  );

  return useWorkspaceSelectionPresentation({
    selectedIds,
    selectionMode,
    activeId: activeId ?? "",
    exitSelection: () => exitSelection(),
    actionButtons: selectionActionButtons,
    doneLabel: labels.selectionDone,
    floatingClassName: "drive-selection-bar",
  });
}
