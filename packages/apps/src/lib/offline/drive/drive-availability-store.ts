import { rememberOfflineUsername } from "@/lib/offline/core/offline-account";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import {
  driveAvailabilityTable,
  DRIVE_DOMAIN,
  type OfflineDriveAvailabilityRow,
  type OfflineDriveAvailabilitySource,
} from "@/lib/offline/drive/drive-schema";

export function normalizeDriveAvailabilityPath(apiPath: string): string {
  return apiPath.trim().replace(/^\/+/, "");
}

export async function listDriveAvailability(
  username: string,
): Promise<OfflineDriveAvailabilityRow[]> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  return driveAvailabilityTable(db).orderBy("pinnedAt").reverse().toArray();
}

export async function readDriveAvailability(
  username: string,
  apiPath: string,
): Promise<OfflineDriveAvailabilityRow | undefined> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  return driveAvailabilityTable(db).get(normalizeDriveAvailabilityPath(apiPath));
}

export async function writeDriveAvailability(
  username: string,
  row: Pick<OfflineDriveAvailabilityRow, "id" | "source"> &
    Partial<Pick<OfflineDriveAvailabilityRow, "pinnedAt" | "lastSyncedAt" | "entryModifiedAt">>,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const id = normalizeDriveAvailabilityPath(row.id);
  await driveAvailabilityTable(db).put({
    id,
    source: row.source,
    pinnedAt: row.pinnedAt ?? Date.now(),
    lastSyncedAt: row.lastSyncedAt ?? null,
    entryModifiedAt: row.entryModifiedAt ?? null,
  });
  rememberOfflineUsername(DRIVE_DOMAIN, username);
}

export async function removeDriveAvailability(username: string, apiPath: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await driveAvailabilityTable(db).delete(normalizeDriveAvailabilityPath(apiPath));
}

export async function markDriveAvailabilitySynced(
  username: string,
  apiPath: string,
  entryModifiedAt?: number | null,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const id = normalizeDriveAvailabilityPath(apiPath);
  const existing = await driveAvailabilityTable(db).get(id);
  if (!existing) return;
  await driveAvailabilityTable(db).put({
    ...existing,
    lastSyncedAt: Date.now(),
    entryModifiedAt: entryModifiedAt ?? existing.entryModifiedAt,
  });
}

export async function migrateDriveAvailabilityPath(
  username: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const table = driveAvailabilityTable(db);
  const oldId = normalizeDriveAvailabilityPath(oldPath);
  const newId = normalizeDriveAvailabilityPath(newPath);
  if (oldId === newId) return;
  const existing = await table.get(oldId);
  if (!existing) return;
  await table.put({ ...existing, id: newId });
  await table.delete(oldId);
}

export function isManualDriveAvailability(row: OfflineDriveAvailabilityRow): boolean {
  return row.source === "manual";
}

export type { OfflineDriveAvailabilitySource };
