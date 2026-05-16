import { Button } from "@/button/src/button";
import { Input } from "@/ui/input";
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
import type { useDriveController } from "@/drive-core/src/use-drive-controller";

type DriveController = ReturnType<typeof useDriveController>;

type DriveWorkspaceModalsProps = {
  controller: DriveController;
};

export function DriveWorkspaceModals({ controller }: DriveWorkspaceModalsProps) {
  const {
    newFolderDialogOpen,
    setNewFolderDialogOpen,
    newFolderName,
    setNewFolderName,
    submitCreateFolder,
    renameDialog,
    setRenameDialog,
    renameName,
    setRenameName,
    submitRenameItem,
    confirmDelete,
    setConfirmDelete,
    reallyDelete,
    moveToTrash,
  } = controller;

  return (
    <>
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCreateFolder();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreateFolder} disabled={!newFolderName.trim()}>
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRenameDialog(null);
            setRenameName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename item</DialogTitle>
            <DialogDescription>Enter a new name for this file or folder.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Name"
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitRenameItem();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialog(null);
                setRenameName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitRenameItem} disabled={!renameName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.permanent ? "Delete permanently?" : "Move to Trash?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.permanent
                ? `This will permanently delete ${confirmDelete?.ids.length} file${
                    confirmDelete && confirmDelete.ids.length === 1 ? "" : "s"
                  }. This cannot be undone.`
                : `This will move ${confirmDelete?.ids.length} file${
                    confirmDelete && confirmDelete.ids.length === 1 ? "" : "s"
                  } to Trash.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  if (confirmDelete.permanent) reallyDelete(confirmDelete.ids);
                  else moveToTrash(confirmDelete.ids);
                }
                setConfirmDelete(null);
              }}
            >
              {confirmDelete?.permanent ? "Delete" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
