import Dexie, { type EntityTable } from "dexie";

export type OfflineMetaRow = {
  key: string;
  value: string;
};

export type OfflineAddressBookRow = {
  id: string;
  data: string;
};

export type OfflineContactCardRow = {
  id: string;
  addressBookId: string;
  data: string;
  pendingSync: boolean;
};

export type OfflineOutboxRow = {
  id: string;
  domain: string;
  op: string;
  payload: string;
  ifInState?: string;
  createdAt: number;
  retries: number;
  lastError?: string;
};

export class WgwOfflineDatabase extends Dexie {
  meta!: EntityTable<OfflineMetaRow, "key">;
  contacts_address_books!: EntityTable<OfflineAddressBookRow, "id">;
  contacts_cards!: EntityTable<OfflineContactCardRow, "id">;
  outbox!: EntityTable<OfflineOutboxRow, "id">;

  constructor(accountKey: string) {
    super(`wgw-offline-${accountKey}`);
    this.version(1).stores({
      meta: "key",
      contacts_address_books: "id",
      contacts_cards: "id, addressBookId, pendingSync",
      outbox: "id, domain, createdAt",
    });
  }
}

const dbCache = new Map<string, WgwOfflineDatabase>();

export function offlineDbForAccount(accountKey: string): WgwOfflineDatabase {
  const cached = dbCache.get(accountKey);
  if (cached) return cached;
  const db = new WgwOfflineDatabase(accountKey);
  dbCache.set(accountKey, db);
  return db;
}

export function offlineAccountKeyFromUsername(username: string): string {
  return username.trim().toLowerCase() || "default";
}
