/**
 * Test-only neutral "app #2" domain fixture. Mirrors contacts-schema patterns
 * (table registration + additive index migration) without coupling to production
 * notes code. Import from offline multi-domain tests only — not from app runtime.
 */
import type { EntityTable, Transaction } from "dexie";
import {
  registerOfflineDomainTables,
  type WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";

export type NotesFixtureNotebookRow = {
  id: string;
  title: string;
};

export type NotesFixturePageRow = {
  id: string;
  notebookId: string;
  body: string;
  /** Last local write time (epoch ms). Indexed at schema v11 for recency queries. */
  updatedAt: number;
};

/** Test-only domain key — uses v10–v11 to stay clear of contacts v2–v3. */
export const NOTES_FIXTURE_DOMAIN = "notes-fixture";

/** Version steps for the fixture — mirror contacts-schema v2/v3 layout at v10/v11. */
export const NOTES_FIXTURE_OFFLINE_VERSION = {
  tables: 10,
  updatedAtIndex: 11,
} as const;

/**
 * Copy this fixture when adding multi-domain offline tests for a new app — swap
 * table names, row types, domain key, and version numbers per offline-platform.md.
 */
registerOfflineDomainTables({
  domain: NOTES_FIXTURE_DOMAIN,
  versions: [
    {
      version: NOTES_FIXTURE_OFFLINE_VERSION.tables,
      stores: {
        notes_fixture_notebooks: "id",
        notes_fixture_pages: "id, notebookId",
      },
    },
    {
      version: NOTES_FIXTURE_OFFLINE_VERSION.updatedAtIndex,
      stores: {
        notes_fixture_pages: "id, notebookId, updatedAt",
      },
      upgrade: async (tx: Transaction) => {
        const now = Date.now();
        await tx
          .table<NotesFixturePageRow>("notes_fixture_pages")
          .toCollection()
          .modify((row) => {
            if (typeof row.updatedAt !== "number") {
              row.updatedAt = now;
            }
          });
      },
    },
  ],
});

export function notesFixturePagesTable(
  db: WgwOfflineDatabase,
): EntityTable<NotesFixturePageRow, "id"> {
  return db.table<NotesFixturePageRow, string>("notes_fixture_pages") as EntityTable<
    NotesFixturePageRow,
    "id"
  >;
}

export function notesFixtureNotebooksTable(
  db: WgwOfflineDatabase,
): EntityTable<NotesFixtureNotebookRow, "id"> {
  return db.table<NotesFixtureNotebookRow, string>("notes_fixture_notebooks") as EntityTable<
    NotesFixtureNotebookRow,
    "id"
  >;
}
