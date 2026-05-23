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
    renamePending,
    closeRenameDialog,
    submitRename,
  } = controller;

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
        <Input
          autoFocus
          placeholder={labels.rename}
          value={renameName}
          disabled={renamePending}
          onChange={(event) => setRenameName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submitRename();
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={closeRenameDialog} disabled={renamePending}>
            {labels.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={() => void submitRename()}
            disabled={renamePending || !renameName.trim()}
          >
            {labels.renameAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
