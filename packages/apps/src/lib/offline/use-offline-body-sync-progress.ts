import { useEffect, useState } from "react";

export type OfflineBodySyncProgress = {
  running: boolean;
  total: number;
  synced: number;
  failed: number;
  updatedAt: number;
};

type UseOfflineBodySyncProgressOptions = {
  enabled: boolean;
  readProgress: () => Promise<OfflineBodySyncProgress>;
  pollMs?: number;
};

export function useOfflineBodySyncProgress({
  enabled,
  readProgress,
  pollMs = 1500,
}: UseOfflineBodySyncProgressOptions): OfflineBodySyncProgress {
  const [progress, setProgress] = useState<OfflineBodySyncProgress>({
    running: false,
    total: 0,
    synced: 0,
    failed: 0,
    updatedAt: 0,
  });

  useEffect(() => {
    if (!enabled) {
      setProgress((prev) => ({ ...prev, running: false }));
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const next = await readProgress().catch(() => null);
      if (!cancelled && next) {
        setProgress(next);
      }
      if (cancelled) return;
      timer = setTimeout(tick, pollMs);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, pollMs, readProgress]);

  return progress;
}
