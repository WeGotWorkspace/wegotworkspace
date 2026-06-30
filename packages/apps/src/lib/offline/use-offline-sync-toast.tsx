import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";

/** Toast when a reconnect/outbox flush cycle completes (pending → cleared). */
export function useOfflineSyncToast(syncing: boolean, clearedLabel: string): void {
  const wasSyncingRef = useRef(false);
  const { show } = useAppToast();

  useEffect(() => {
    if (wasSyncingRef.current && !syncing) {
      show(clearedLabel, { icon: <Check className="size-4" /> });
    }
    wasSyncingRef.current = syncing;
  }, [clearedLabel, show, syncing]);
}

export function useOfflinePendingToast(
  pending: boolean,
  clearedLabel: string,
  enabled = true,
): void {
  const wasPendingRef = useRef(false);
  const { show } = useAppToast();

  useEffect(() => {
    if (!enabled) {
      wasPendingRef.current = false;
      return;
    }
    if (wasPendingRef.current && !pending) {
      show(clearedLabel, { icon: <Check className="size-4" /> });
    }
    wasPendingRef.current = pending;
  }, [clearedLabel, enabled, pending, show]);
}
