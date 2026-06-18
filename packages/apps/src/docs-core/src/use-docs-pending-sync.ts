import { useCallback, useEffect, useState } from "react";
import { useConnectivity } from "@/hooks/use-connectivity";
import { listPendingDocPaths } from "@/lib/offline/docs/docs-offline-store";

const POLL_INTERVAL_MS = 4000;

/**
 * API paths of My Drive docs with unsynced local changes, for the pending-sync dot.
 */
export function useDocsPendingSync(
  username: string | null | undefined,
  filePath: string | null | undefined,
  refreshKey?: number,
): boolean {
  const [pendingPaths, setPendingPaths] = useState<ReadonlySet<string>>(() => new Set<string>());
  const { online } = useConnectivity();

  const refresh = useCallback(async () => {
    if (!username) {
      setPendingPaths(new Set<string>());
      return;
    }
    try {
      const paths = await listPendingDocPaths(username);
      setPendingPaths(new Set(paths));
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

  return filePath ? pendingPaths.has(filePath) : false;
}
