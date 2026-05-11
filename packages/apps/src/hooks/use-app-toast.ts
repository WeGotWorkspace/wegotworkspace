import { useCallback } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

/**
 * Single entry point for Sonner in app UIs — same role as {@link useConfirmDialog}
 * for dialogs (one place to extend with logging, analytics, or styling later).
 */
export function useAppToast() {
  const show = useCallback((message: string, options?: ExternalToast) => {
    return sonnerToast(message, options);
  }, []);

  const dismiss = useCallback((id?: string | number) => {
    sonnerToast.dismiss(id);
  }, []);

  return { show, dismiss };
}
