import { useConnectivity } from "@/hooks/use-connectivity";
import { defaultOfflineLabels } from "@/lib/offline/core/offline-labels";
import { cn } from "@/lib/utils";
import "@/lib/offline/core/offline-status-indicator.css";

export type OfflineStatusIndicatorProps = {
  /** Override status copy; falls back to {@link defaultOfflineLabels.statusMessage}. */
  message?: string;
  className?: string;
  /** Force connectivity state (Storybook/tests). When omitted, uses {@link useConnectivity}. */
  online?: boolean;
};

export function OfflineStatusIndicator({
  message = defaultOfflineLabels.statusMessage,
  className,
  online: onlineOverride,
}: OfflineStatusIndicatorProps) {
  const { online: hookOnline } = useConnectivity();
  const online = onlineOverride ?? hookOnline;

  if (online) return null;

  return (
    <div className={cn("offline-status-indicator", className)} role="status" aria-live="polite">
      <span className="offline-status-indicator__dot" aria-hidden="true" />
      <span className="offline-status-indicator__text">{message}</span>
    </div>
  );
}
