import { useEffect, useRef } from "react";
import { useAppToast } from "@/hooks/use-app-toast";

type UseSyncRetryToastOptions = {
  active: boolean;
  title: string;
  message?: string;
  retryLabel: string;
  onRetry: () => void;
};

/**
 * Shows a persistent error toast with Retry while offline/outbox sync is stuck.
 * Dismisses when the user taps Retry or when `active` becomes false.
 */
export function useSyncRetryToast({
  active,
  title,
  message,
  retryLabel,
  onRetry,
}: UseSyncRetryToastOptions): void {
  const { show, dismiss } = useAppToast();
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (active) {
      if (toastIdRef.current != null) return;
      toastIdRef.current = show(title, {
        severity: "error",
        description: message,
        duration: Number.POSITIVE_INFINITY,
        canRetry: true,
        retryLabel,
        onRetry: () => {
          onRetry();
          if (toastIdRef.current != null) {
            dismiss(toastIdRef.current);
            toastIdRef.current = null;
          }
        },
      });
      return;
    }

    if (toastIdRef.current != null) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [active, dismiss, message, onRetry, retryLabel, show, title]);

  useEffect(
    () => () => {
      if (toastIdRef.current != null) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    },
    [dismiss],
  );
}
