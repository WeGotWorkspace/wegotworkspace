import { Button } from "@/button/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";
import "@/contacts-core/src/contacts-conflict-dialog.css";

export type ContactsConflictDialogProps = {
  open: boolean;
  /** Display name of the contact currently being resolved. */
  contactName: string;
  /** Conflicts still queued behind this one (shown as a hint). */
  remainingCount?: number;
  /** Disables the actions while a resolution is in flight. */
  busy?: boolean;
  labels: ContactsUILabels;
  onKeepLocal: () => void;
  onUseServer: () => void;
  /** Called when the dialog is dismissed (Esc/overlay) without choosing. */
  onOpenChange?: (open: boolean) => void;
};

/** Binary "Keep mine / Use server" resolver for a single contact sync conflict. */
export function ContactsConflictDialog({
  open,
  contactName,
  remainingCount = 0,
  busy = false,
  labels: L,
  onKeepLocal,
  onUseServer,
  onOpenChange,
}: ContactsConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="contacts-dialog-surface contacts-conflict-dialog">
        <DialogHeader>
          <DialogTitle>{L.conflictTitle}</DialogTitle>
          <DialogDescription>{L.conflictDescription(contactName)}</DialogDescription>
        </DialogHeader>
        {remainingCount > 0 ? (
          <p className="contacts-conflict-dialog__remaining">
            {L.conflictRemaining(remainingCount)}
          </p>
        ) : null}
        <DialogFooter className="contacts-conflict-dialog__actions">
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
