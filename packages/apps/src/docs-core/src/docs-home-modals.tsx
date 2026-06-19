import { useMemo } from "react";
import { Button } from "@/button/src/button";
import { RenameFilenameField } from "@/dialogs/src/rename-filename-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { DriveMoveToDialog } from "@/drive-core/src/drive-move-to-dialog";
import { driveLabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { DocsHomeActions } from "@/docs-core/src/use-docs-home-actions";

type DocsHomeModalsProps = {
  actions: DocsHomeActions;
  labels: DocsUILabels;
  files: DriveFile[];
  username: string;
  groupRoots: string[];
  operations?: DriveAPIOperations;
};

export function DocsHomeModals({
  actions,
  labels,
  files,
  username,
  groupRoots,
  operations,
}: DocsHomeModalsProps) {
  const {
    renameState,
    renameName,
    setRenameName,
    submitRename,
    closeRename,
    moveState,
    closeMove,
    confirmMove,
    deleteState,
    closeDelete,
    confirmTrash,
  } = actions;

  const groupPaths = useMemo(() => groupRoots.map((root) => `Groups/${root}`), [groupRoots]);
  const groupRootNames = useMemo(() => new Set(groupRoots), [groupRoots]);
  const moveTarget = moveState ? actions.fileById(moveState.id) : null;
  const canSubmitRename = renameName.trim().length > 0;

  return (
    <>
      <Dialog open={!!renameState} onOpenChange={(open) => !open && closeRename()}>
        <DialogContent className="docs-dialog-surface">
          <DialogHeader>
            <DialogTitle>{labels.renameDialogTitle}</DialogTitle>
            <DialogDescription>{labels.renameDialogDescription}</DialogDescription>
          </DialogHeader>
          <RenameFilenameField
            autoFocus
            placeholder="Name"
            baseName={renameName}
            extension={renameState?.extension || undefined}
            onBaseNameChange={setRenameName}
            onEnter={submitRename}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeRename}>
              {labels.cancel}
            </Button>
            <Button variant="primary" onClick={submitRename} disabled={!canSubmitRename}>
              {labels.renameAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteState} onOpenChange={(open) => !open && closeDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>This will move 1 file to Trash.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTrash}>Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DriveMoveToDialog
        open={!!moveState}
        labels={driveLabels}
        files={files}
        groupPaths={groupPaths}
        moveIds={moveState ? [moveState.id] : []}
        view={{ type: "folder", path: "My Drive" }}
        singleItemParent={moveTarget?.parent}
        operations={operations}
        currentUsername={username}
        groupRootNames={groupRootNames}
        onClose={closeMove}
        onConfirm={confirmMove}
      />
    </>
  );
}
