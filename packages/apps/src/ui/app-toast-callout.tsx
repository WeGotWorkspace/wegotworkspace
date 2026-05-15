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
}: AppToastCalloutProps) {
  return (
    <Callout
      severity={severity}
      title={title}
      message={message}
      icon={icon}
      action={
        showUndo ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            label={undoLabel}
            onClick={() => {
              onUndo?.();
              toast.dismiss(toastId);
            }}
          />
        ) : null
      }
    />
  );
}
