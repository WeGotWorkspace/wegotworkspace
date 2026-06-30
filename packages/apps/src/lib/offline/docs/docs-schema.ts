import type { EntityTable } from "dexie";
import {
  registerOfflineDomainTables,
  type WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";
import { DOCS_OFFLINE_VERSION } from "@/lib/offline/core/offline-version-allocation";

export const DOCS_DOMAIN = "docs";

/** Serialized unified-search row for the Docs home browse cache. */
export type OfflineDocsListingRow = {
  /** `${cacheKey}::${sourceKey}` */
  id: string;
  cacheKey: string;
  sourceKey: string;
  /** JSON payload mirroring `WgwUnifiedSearchResult` fields needed for listing. */
  data: string;
  modifiedAt: number;
  /** Stable ordering within a cache snapshot (0 = newest page-1 row). */
  sortIndex: number;
};

/**
 * Docs Dexie tables, registered as additive versions on top of the core baseline:
 *
 * - **v20** introduces `docs_listing_rows` for offline home browse snapshots.
 */
registerOfflineDomainTables({
  domain: DOCS_DOMAIN,
  versions: [
    {
      version: DOCS_OFFLINE_VERSION.listingTables,
      stores: {
        docs_listing_rows: "id, cacheKey, modifiedAt, sortIndex",
      },
    },
  ],
});

export function docsListingRowsTable(
  db: WgwOfflineDatabase,
): EntityTable<OfflineDocsListingRow, "id"> {
  return db.table<OfflineDocsListingRow, string>("docs_listing_rows") as EntityTable<
    OfflineDocsListingRow,
    "id"
  >;
}
