import type { EntityTable } from "dexie";
import {
  registerOfflineDomainTables,
  type WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";
import { DRIVE_OFFLINE_VERSION } from "@/lib/offline/core/offline-version-allocation";

export const DRIVE_DOMAIN = "drive";

/** Cached directory entry (serialized WgwDriveDirectoryEntry). */
export type OfflineDriveEntryRow = {
  /** Normalized API path (no leading slash). */
  id: string;
  parentPath: string;
  type: "file" | "dir";
  modifiedAt: number;
  /** JSON payload mirroring listing entry fields. */
  data: string;
};

/** Binary file body cached for offline open/download. */
export type OfflineDriveContentBlobRow = {
  id: string;
  size: number;
  mimeType: string;
  syncedAt: number;
  blob: Blob;
};

export type OfflineDriveAvailabilitySource = "auto" | "manual";

/** Tracks which file paths have offline content (auto or manual pin). */
export type OfflineDriveAvailabilityRow = {
  id: string;
  source: OfflineDriveAvailabilitySource;
  pinnedAt: number;
  lastSyncedAt: number | null;
  entryModifiedAt: number | null;
};

registerOfflineDomainTables({
  domain: DRIVE_DOMAIN,
  versions: [
    {
      version: DRIVE_OFFLINE_VERSION.entriesTables,
      stores: {
        drive_entries: "id, parentPath, type, modifiedAt",
      },
    },
    {
      version: DRIVE_OFFLINE_VERSION.contentTables,
      stores: {
        drive_content_blobs: "id, size, syncedAt",
      },
    },
    {
      version: DRIVE_OFFLINE_VERSION.availabilityTables,
      stores: {
        drive_availability: "id, source, pinnedAt, lastSyncedAt",
      },
    },
  ],
});

export function driveEntriesTable(db: WgwOfflineDatabase): EntityTable<OfflineDriveEntryRow, "id"> {
  return db.table<OfflineDriveEntryRow, string>("drive_entries") as EntityTable<
    OfflineDriveEntryRow,
    "id"
  >;
}

export function driveContentBlobsTable(
  db: WgwOfflineDatabase,
): EntityTable<OfflineDriveContentBlobRow, "id"> {
  return db.table<OfflineDriveContentBlobRow, string>("drive_content_blobs") as EntityTable<
    OfflineDriveContentBlobRow,
    "id"
  >;
}

export function driveAvailabilityTable(
  db: WgwOfflineDatabase,
): EntityTable<OfflineDriveAvailabilityRow, "id"> {
  return db.table<OfflineDriveAvailabilityRow, string>("drive_availability") as EntityTable<
    OfflineDriveAvailabilityRow,
    "id"
  >;
}
