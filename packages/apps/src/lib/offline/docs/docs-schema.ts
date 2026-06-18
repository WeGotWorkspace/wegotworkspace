import type { EntityTable, Transaction } from "dexie";
import {
  registerOfflineDomainTables,
  type WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";
import { DOCS_OFFLINE_VERSION } from "@/lib/offline/core/offline-version-allocation";

export type OfflineDocsFileRow = {
  apiPath: string;
  content: string;
  cachedAt: number;
  pendingSync: boolean;
  /** Placeholder for future etag/revision support from the Files API. */
  serverRevision?: string;
};

export const DOCS_DOMAIN = "docs";

/**
 * Docs Dexie tables, registered as additive versions on top of the core
 * `{ meta, outbox }` baseline (v1):
 *
 * - **v20** introduces `docs_files`.
 * - **v21** adds an additive `pendingSync` index and backfills the field.
 */
registerOfflineDomainTables({
  domain: DOCS_DOMAIN,
  versions: [
    {
      version: DOCS_OFFLINE_VERSION.tables,
      stores: {
        docs_files: "apiPath, cachedAt",
      },
    },
    {
      version: DOCS_OFFLINE_VERSION.pendingSyncIndex,
      stores: {
        docs_files: "apiPath, cachedAt, pendingSync",
      },
      upgrade: async (tx: Transaction) => {
        await tx
          .table<OfflineDocsFileRow>("docs_files")
          .toCollection()
          .modify((row) => {
            if (typeof row.pendingSync !== "boolean") {
              row.pendingSync = false;
            }
          });
      },
    },
  ],
});

export function docsFilesTable(db: WgwOfflineDatabase): EntityTable<OfflineDocsFileRow, "apiPath"> {
  return db.table<OfflineDocsFileRow, string>("docs_files") as EntityTable<
    OfflineDocsFileRow,
    "apiPath"
  >;
}
