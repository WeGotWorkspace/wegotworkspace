import { useCallback, useState } from "react";
import { Button } from "@/button/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DriveFolderPicker,
  resolveDriveFolderPickerStartPath,
} from "@/drive-core/src/drive-folder-picker";
import type { DriveFile, ViewKey } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";

export function DriveMoveToDialog({
  open,
  labels,
  files,
  groupPaths,
  moveIds,
  view,
  singleItemParent,
  operations,
  currentUsername,
  groupRootNames,
  onClose,
  onConfirm,
}: {
  open: boolean;
  labels: DriveUILabels;
  files: DriveFile[];
  groupPaths: string[];
  moveIds: string[];
  view: ViewKey;
  singleItemParent?: string;
  operations?: DriveAPIOperations;
  currentUsername: string;
  groupRootNames: Set<string>;
  onClose: () => void;
  onConfirm: (destinationPath: string) => void;
}) {
  const initialBrowsePath = resolveDriveFolderPickerStartPath(view, singleItemParent);
  const [destinationPath, setDestinationPath] = useState<string | null>(null);

  const handleDestinationChange = useCallback((path: string | null) => {
    setDestinationPath(path);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="drive-dialog-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.moveDialogTitle}</DialogTitle>
          <DialogDescription>{labels.moveDialogDescription}</DialogDescription>
        </DialogHeader>

        {open ? (
          <DriveFolderPicker
            key={initialBrowsePath}
            labels={labels}
            files={files}
            groupPaths={groupPaths}
            moveIds={moveIds}
            initialBrowsePath={initialBrowsePath}
            operations={operations}
            currentUsername={currentUsername}
            groupRootNames={groupRootNames}
            onDestinationChange={handleDestinationChange}
          />
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {labels.moveDialogCancel}
          </Button>
          <Button
            variant="primary"
            disabled={!destinationPath}
            onClick={() => {
              if (!destinationPath) return;
              onConfirm(destinationPath);
            }}
          >
            {labels.moveDialogConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
