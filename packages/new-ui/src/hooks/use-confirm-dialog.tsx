import { useCallback, useState, type ReactNode } from "react";

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
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "default" | "destructive";

export type ConfirmDialogRequest = {
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
};

/**
 * Controlled confirm pattern (title, description, labels, destructive styling).
 * Render `confirmDialog` once near the root of your screen; call `requestConfirm` to open.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmDialogRequest | null>(null);

  const dismiss = useCallback(() => {
    setRequest(null);
  }, []);

  const requestConfirm = useCallback((r: ConfirmDialogRequest) => {
    setRequest(r);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) dismiss();
    },
    [dismiss],
  );

  const variant = request?.variant ?? "default";

  const confirmDialog = (
    <AlertDialog open={request !== null} onOpenChange={handleOpenChange}>
      {request ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{request.title}</AlertDialogTitle>
            <AlertDialogDescription>{request.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{request.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                variant === "destructive" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={() => {
                request.onConfirm();
                dismiss();
              }}
            >
              {request.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );

  return { confirmDialog, requestConfirm, dismiss };
}
