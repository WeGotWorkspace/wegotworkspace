import { useMemo } from "react";
import { Button, buttonVariants } from "@/button/src/button";
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
import { DriveCreateMarkdownDialog } from "@/drive-core/src/drive-create-markdown-dialog";
import { DriveMoveToDialog } from "@/drive-core/src/drive-move-to-dialog";
import { driveLabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { DriveFile, ViewKey } from "@/drive-core/src/drive-models";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { DocsHomeActions } from "@/docs-core/src/use-docs-home-actions";

type DocsHomeModalsProps = {
  actions: DocsHomeActions;
  labels: DocsUILabels;
  files: DriveFile[];
  username: string;
  groupRoots: string[];
  operations?: DriveAPIOperations;
  createDialogOpen?: boolean;
  createDialogDefaultName?: string;
  createDialogBrowsePath?: string;
  createDialogView?: ViewKey;
  onCloseCreateDialog?: () => void;
  onConfirmCreateDocument?: (fileName: string, destinationPath: string) => void;
};

export function DocsHomeModals({
  actions,
  labels,
  files,
  username,
  groupRoots,
  operations,
  createDialogOpen = false,
  createDialogDefaultName = "Untitled.md",
  createDialogBrowsePath = "My Drive",
  createDialogView = { type: "folder", path: "My Drive" },
  onCloseCreateDialog,
  onConfirmCreateDocument,
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
  const moveTarget = moveState ? actions.fileById(moveState.ids[0]!) : null;
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
            <AlertDialogDescription>
              {deleteState && deleteState.ids.length === 1
                ? "This will move 1 file to Trash."
                : `This will move ${deleteState?.ids.length ?? 0} files to Trash.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmTrash}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DriveMoveToDialog
        open={!!moveState}
        labels={driveLabels}
        files={files}
        groupPaths={groupPaths}
        moveIds={moveState?.ids ?? []}
        view={{ type: "folder", path: "My Drive" }}
        singleItemParent={moveTarget?.parent}
        operations={operations}
        currentUsername={username}
        groupRootNames={groupRootNames}
        dialogSurfaceClassName="docs-dialog-surface"
        onClose={closeMove}
        onConfirm={confirmMove}
      />

      {onCloseCreateDialog && onConfirmCreateDocument ? (
        <DriveCreateMarkdownDialog
          open={createDialogOpen}
          labels={driveLabels}
          defaultName={createDialogDefaultName}
          initialBrowsePath={createDialogBrowsePath}
          files={files}
          groupPaths={groupPaths}
          view={createDialogView}
          operations={operations}
          currentUsername={username}
          groupRootNames={groupRootNames}
          dialogSurfaceClassName="docs-dialog-surface"
          onClose={onCloseCreateDialog}
          onConfirm={onConfirmCreateDocument}
        />
      ) : null}
    </>
  );
}
