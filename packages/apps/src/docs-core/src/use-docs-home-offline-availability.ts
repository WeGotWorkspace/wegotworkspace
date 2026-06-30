import { useCallback, useEffect, useMemo, useState } from "react";
import { hasDocsCollabOfflinePersistence } from "@/lib/offline/docs/docs-collab-offline-availability";
import type { DriveFile } from "@/drive-core/src/drive-models";

/** Resolves which home rows have local collab persistence while offline. */
export function useDocsHomeOfflineAvailability(
  files: readonly DriveFile[],
  enabled: boolean,
): {
  offlineAvailableIds: ReadonlySet<string>;
  isResolving: boolean;
} {
  const [offlineAvailableIds, setOfflineAvailableIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isResolving, setIsResolving] = useState(false);

  const fileKeys = useMemo(
    () => files.map((file) => `${file.id}:${file.apiPath ?? ""}`).join("|"),
    [files],
  );

  useEffect(() => {
    if (!enabled || files.length === 0) {
      setOfflineAvailableIds(new Set());
      setIsResolving(false);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    void (async () => {
      const available = new Set<string>();
      await Promise.all(
        files.map(async (file) => {
          if (!file.apiPath) return;
          const hasLocal = await hasDocsCollabOfflinePersistence(file.apiPath);
          if (hasLocal) available.add(file.id);
        }),
      );
      if (!cancelled) {
        setOfflineAvailableIds(available);
        setIsResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, fileKeys, files]);

  const stableIds = useMemo(() => offlineAvailableIds, [offlineAvailableIds]);

  return { offlineAvailableIds: stableIds, isResolving };
}

export function useDocsHomeOpenGuard({
  isOfflineListing,
  offlineAvailableIds,
  onUnavailable,
}: {
  isOfflineListing: boolean;
  offlineAvailableIds: ReadonlySet<string>;
  onUnavailable: () => void;
}) {
  return useCallback(
    (file: DriveFile) => {
      if (!isOfflineListing || offlineAvailableIds.has(file.id)) {
        return true;
      }
      onUnavailable();
      return false;
    },
    [isOfflineListing, offlineAvailableIds, onUnavailable],
  );
}
