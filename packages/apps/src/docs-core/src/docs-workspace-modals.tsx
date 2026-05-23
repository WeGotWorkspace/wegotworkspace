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
import type { useDocsController } from "@/docs-core/src/use-docs-controller";

type DocsController = ReturnType<typeof useDocsController>;

type DocsWorkspaceModalsProps = {
  controller: DocsController;
};

export function DocsWorkspaceModals({ controller }: DocsWorkspaceModalsProps) {
  const {
    labels,
    renameDialogOpen,
    renameName,
    setRenameName,
    renameExtension,
    renamePending,
    closeRenameDialog,
    submitRename,
  } = controller;

  const canSubmitRename = renameName.trim().length > 0;

  return (
    <Dialog
      open={renameDialogOpen}
      onOpenChange={(open) => {
        if (!open) closeRenameDialog();
      }}
    >
      <DialogContent className="docs-dialog-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.renameDialogTitle}</DialogTitle>
          <DialogDescription>{labels.renameDialogDescription}</DialogDescription>
        </DialogHeader>
        <RenameFilenameField
          autoFocus
          placeholder={labels.rename}
          baseName={renameName}
          extension={renameExtension || undefined}
          disabled={renamePending}
          onBaseNameChange={setRenameName}
          onEnter={() => void submitRename()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={closeRenameDialog} disabled={renamePending}>
            {labels.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={() => void submitRename()}
            disabled={renamePending || !canSubmitRename}
          >
            {labels.renameAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
