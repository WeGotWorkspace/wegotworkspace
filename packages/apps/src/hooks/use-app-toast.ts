import { createElement, useCallback } from "react";
import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import type { CalloutSeverity } from "@/callout/src/callout";
import { AppToastCallout } from "@/ui/app-toast-callout";

const DEFAULT_DURATION_MS = 4000;

const CUSTOM_TOAST_FRAME_CLASS =
  "!w-[min(100vw-1.5rem,26rem)] !max-w-none !bg-transparent !p-0 !border-0 !shadow-none";

export type AppToastShowOptions = {
  severity?: CalloutSeverity;
  description?: ReactNode;
  duration?: number;
  icon?: ReactNode;
  /** When true with `onUndo`, renders an Undo control in the callout. */
  canUndo?: boolean;
  onUndo?: () => void;
  undoLabel?: string;
};

export type AppToastApi = {
  show: (title: string, options?: AppToastShowOptions) => string | number;
  dismiss: (id?: string | number) => string | number;
  showSuccess: (title: string, options?: Omit<AppToastShowOptions, "severity">) => string | number;
  showError: (title: string, options?: Omit<AppToastShowOptions, "severity">) => string | number;
};

/**
 * App-wide toast surface: Sonner hosts {@link AppToastCallout} so toasts share
 * {@link Callout} severity, spacing, and optional undo.
 */
export function useAppToast(): AppToastApi {
  const show = useCallback((title: string, options?: AppToastShowOptions) => {
    const {
      severity = "success",
      description,
      duration = DEFAULT_DURATION_MS,
      icon,
      canUndo = false,
      onUndo,
      undoLabel,
    } = options ?? {};

    const showUndo = Boolean(canUndo && onUndo);

    return sonnerToast.custom(
      (id) =>
        createElement(AppToastCallout, {
          toastId: id,
          title,
          message: description,
          severity,
          icon,
          showUndo,
          onUndo,
          undoLabel,
        }),
      {
        duration,
        className: CUSTOM_TOAST_FRAME_CLASS,
      },
    );
  }, []);

  const dismiss = useCallback((id?: string | number) => {
    return sonnerToast.dismiss(id);
  }, []);

  const showSuccess = useCallback(
    (title: string, options?: Omit<AppToastShowOptions, "severity">) => {
      return show(title, { ...options, severity: "success" });
    },
    [show],
  );

  const showError = useCallback(
    (title: string, options?: Omit<AppToastShowOptions, "severity">) => {
      return show(title, { ...options, severity: "error" });
    },
    [show],
  );

  return { show, dismiss, showSuccess, showError };
}
