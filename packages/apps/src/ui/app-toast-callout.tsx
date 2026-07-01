import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/button/src/button";
import { Callout, type CalloutSeverity } from "@/callout/src/callout";

export type AppToastCalloutProps = {
  toastId: string | number;
  title: string;
  message?: ReactNode;
  severity: CalloutSeverity;
  icon?: ReactNode;
  showUndo?: boolean;
  onUndo?: () => void;
  undoLabel?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
};

export function AppToastCallout({
  toastId,
  title,
  message,
  severity,
  icon,
  showUndo = false,
  onUndo,
  undoLabel = "Undo",
  showRetry = false,
  onRetry,
  retryLabel = "Retry",
}: AppToastCalloutProps) {
  const showAction = showUndo || showRetry;
  const actionLabel = showUndo ? undoLabel : retryLabel;
  const onAction = showUndo ? onUndo : onRetry;

  return (
    <Callout
      className="w-full min-w-0"
      severity={severity}
      title={title}
      message={message}
      icon={icon}
      action={
        showAction ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            label={actionLabel}
            onClick={() => {
              onAction?.();
              toast.dismiss(toastId);
            }}
          />
        ) : null
      }
    />
  );
}
