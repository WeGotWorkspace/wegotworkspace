import type { EntityTable, Transaction } from "dexie";
import {
  registerOfflineDomainTables,
  type WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";

export type OfflineAddressBookRow = {
  id: string;
  data: string;
};

export type OfflineContactCardRow = {
  id: string;
  addressBookId: string;
  data: string;
  pendingSync: boolean;
  /** Last local write time (epoch ms). Indexed at schema v3 for recency queries. */
  updatedAt: number;
};

export const CONTACTS_DOMAIN = "contacts";

/**
 * Contacts Dexie tables, registered as additive versions on top of the core
 * `{ meta, outbox }` baseline (v1):
 *
 * - **v2** introduces `contacts_address_books` and `contacts_cards`.
 * - **v3** adds an additive `updatedAt` index on `contacts_cards` and backfills
 *   the field for existing rows — the reference pattern an app #2 follows to add
 *   an index without losing data.
 */
registerOfflineDomainTables({
  domain: CONTACTS_DOMAIN,
  versions: [
    {
      version: 2,
      stores: {
        contacts_address_books: "id",
        contacts_cards: "id, addressBookId, pendingSync",
      },
    },
    {
      version: 3,
      stores: {
        contacts_cards: "id, addressBookId, pendingSync, updatedAt",
      },
      upgrade: async (tx: Transaction) => {
        const now = Date.now();
        await tx
          .table<OfflineContactCardRow>("contacts_cards")
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

export function contactsCardsTable(
  db: WgwOfflineDatabase,
): EntityTable<OfflineContactCardRow, "id"> {
  return db.table<OfflineContactCardRow, string>("contacts_cards") as EntityTable<
    OfflineContactCardRow,
    "id"
  >;
}

export function contactsBooksTable(
  db: WgwOfflineDatabase,
): EntityTable<OfflineAddressBookRow, "id"> {
  return db.table<OfflineAddressBookRow, string>("contacts_address_books") as EntityTable<
    OfflineAddressBookRow,
    "id"
  >;
}
