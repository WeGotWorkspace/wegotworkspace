import { Button } from "@/button/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import "@/docs-core/src/docs-conflict-dialog.css";

export type DocsConflictDialogProps = {
  open: boolean;
  documentTitle: string;
  remainingCount?: number;
  busy?: boolean;
  labels: DocsUILabels;
  onKeepLocal: () => void;
  onUseServer: () => void;
  onOpenChange?: (open: boolean) => void;
};

/** Binary "Keep mine / Use server" resolver for a single docs sync conflict. */
export function DocsConflictDialog({
  open,
  documentTitle,
  remainingCount = 0,
  busy = false,
  labels: L,
  onKeepLocal,
  onUseServer,
  onOpenChange,
}: DocsConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="docs-dialog-surface docs-conflict-dialog">
        <DialogHeader>
          <DialogTitle>{L.conflictTitle}</DialogTitle>
          <DialogDescription>{L.conflictDescription(documentTitle)}</DialogDescription>
        </DialogHeader>
        {remainingCount > 0 ? (
          <p className="docs-conflict-dialog__remaining">{L.conflictRemaining(remainingCount)}</p>
        ) : null}
        <DialogFooter className="docs-conflict-dialog__actions">
          <Button variant="subtle" onClick={onUseServer} disabled={busy}>
            {L.conflictUseServer}
          </Button>
          <Button variant="primary" onClick={onKeepLocal} disabled={busy}>
            {L.conflictKeepMine}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
