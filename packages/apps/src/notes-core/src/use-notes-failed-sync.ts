import { useCallback, useEffect, useState } from "react";
import { useConnectivity } from "@/hooks/use-connectivity";
import { listFailedNotesOutbox } from "@/lib/offline/notes-offline-store";

const POLL_INTERVAL_MS = 4000;

/**
 * Count of outbox rows that failed to sync for a transient (non-conflict) reason.
 */
export function useNotesFailedSync(
  username: string | null | undefined,
  refreshKey?: number,
): number {
  const [failedCount, setFailedCount] = useState(0);
  const { online } = useConnectivity();

  const refresh = useCallback(async () => {
    if (!username) {
      setFailedCount(0);
      return;
    }
    try {
      const rows = await listFailedNotesOutbox(username);
      setFailedCount(rows.length);
    } catch {
      // Keep the last known state if the offline store read fails.
    }
  }, [username]);

  useEffect(() => {
    void refresh();
    if (typeof window === "undefined") return;
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [refresh, online, refreshKey]);

  return failedCount;
}
