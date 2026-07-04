import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnectivity } from "@/hooks/use-connectivity";
import {
  readOfflineDeviceContentSettings,
  subscribeOfflineDeviceContentSettings,
} from "@/lib/offline/core/offline-device-settings";
import { listOutboxMutationsForDomain } from "@/lib/offline/core/outbox-store";
import { driveOutboxApiPath } from "@/lib/offline/drive/drive-outbox-flush";
import { DRIVE_DOMAIN } from "@/lib/offline/drive/drive-schema";
import { readDriveContentSyncProgress } from "@/lib/offline/drive/drive-content-sync";
import { readDriveMetadataSyncProgress } from "@/lib/offline/drive/drive-metadata-sync";
import { hasOfflineFileContent } from "@/lib/offline/shared/content-availability";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { normalizeDriveAvailabilityPath } from "@/lib/offline/drive/drive-availability-store";

function fileApiPath(file: DriveFile): string | null {
  const path = file.apiPath?.trim();
  return path ? normalizeDriveAvailabilityPath(path) : null;
}

function parseFileSizeBytes(file: DriveFile): number | null {
  if (file.kind === "folder") return null;
  const raw = file.size?.replace(/[^\d.]/g, "");
  if (!raw) return 0;
  const kb = Number.parseFloat(raw);
  if (Number.isNaN(kb)) return null;
  if (file.size?.includes("MB")) return Math.round(kb * 1024 * 1024);
  if (file.size?.includes("GB")) return Math.round(kb * 1024 * 1024 * 1024);
  if (file.size?.includes("KB")) return Math.round(kb * 1024);
  return Math.round(kb);
}

export function useDriveOfflineAvailability(
  files: readonly DriveFile[],
  enabled: boolean,
  username: string | null | undefined,
): {
  offlineAvailableIds: ReadonlySet<string>;
  offlinePinnedIds: ReadonlySet<string>;
  offlinePendingSyncIds: ReadonlySet<string>;
  isResolving: boolean;
  refresh: () => void;
} {
  const { online } = useConnectivity();
  const [offlineAvailableIds, setOfflineAvailableIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [offlinePinnedIds, setOfflinePinnedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [offlinePendingSyncIds, setOfflinePendingSyncIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isResolving, setIsResolving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);

  const fileKeys = useMemo(
    () => files.map((file) => `${file.id}:${file.apiPath ?? ""}`).join("|"),
    [files],
  );

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    return subscribeOfflineDeviceContentSettings(() => {
      setSettingsVersion((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    if (!enabled || !username || files.length === 0) {
      setOfflineAvailableIds(new Set());
      setOfflinePinnedIds(new Set());
      setOfflinePendingSyncIds(new Set());
      setIsResolving(false);
      return;
    }

    let cancelled = false;
    setIsResolving(true);

    void (async () => {
      const settings = readOfflineDeviceContentSettings();
      const [metadataProgress, contentProgress] = await Promise.all([
        readDriveMetadataSyncProgress(username),
        readDriveContentSyncProgress(username),
      ]);
      const outboxRows = await listOutboxMutationsForDomain(username, DRIVE_DOMAIN);
      const outboxPendingPaths = new Set<string>();
      for (const row of outboxRows) {
        const path = driveOutboxApiPath(row);
        if (path) outboxPendingPaths.add(path);
      }

      const available = new Set<string>();
      const pinned = new Set<string>();
      const pending = new Set<string>();

      if (metadataProgress.running || contentProgress.running) {
        for (const file of files) {
          pending.add(file.id);
        }
      }

      await Promise.all(
        files.map(async (file) => {
          const apiPath = fileApiPath(file);
          if (!apiPath) return;

          if (outboxPendingPaths.has(apiPath)) {
            pending.add(file.id);
          }

          const hasLocal = await hasOfflineFileContent(username, apiPath);
          if (hasLocal) {
            available.add(file.id);
          } else if (online && settings.contentSyncEnabled) {
            const sizeBytes = parseFileSizeBytes(file);
            if (sizeBytes != null && sizeBytes > settings.maxFileSizeBytes) {
              pinned.add(file.id);
            }
          }
        }),
      );

      if (cancelled) return;
      setOfflineAvailableIds(available);
      setOfflinePinnedIds(pinned);
      setOfflinePendingSyncIds(pending);
      setIsResolving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, fileKeys, files, online, refreshToken, settingsVersion, username]);

  return {
    offlineAvailableIds,
    offlinePinnedIds,
    offlinePendingSyncIds,
    isResolving,
    refresh,
  };
}

export function useDriveOfflineOpenGuard(
  files: readonly DriveFile[],
  offlineAvailableIds: ReadonlySet<string>,
  enabled: boolean,
): (file: DriveFile) => boolean {
  const { online } = useConnectivity();
  return useCallback(
    (file: DriveFile) => {
      if (!enabled || online || file.kind === "folder") return true;
      return offlineAvailableIds.has(file.id);
    },
    [enabled, offlineAvailableIds, online],
  );
}
