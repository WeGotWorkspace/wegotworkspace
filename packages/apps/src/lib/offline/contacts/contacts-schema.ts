import type { EntityTable } from "dexie";
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
  /** Last local write time (epoch ms). */
  updatedAt: number;
};

export const CONTACTS_DOMAIN = "contacts";

/**
 * Contacts Dexie tables, registered as additive versions on top of the core
 * `{ meta, outbox }` baseline (v1):
 *
 * - **v2** introduces `contacts_address_books` and `contacts_cards`.
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
