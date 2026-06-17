import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { rememberOfflineContactsUsername } from "@/lib/offline/offline-session";
import type { AddressBook, ContactCard } from "@/contacts-core/src/contacts-types";
import {
  offlineAccountKeyFromUsername,
  offlineDbForAccount,
  type OfflineOutboxRow,
} from "@/lib/offline/offline-db";

const META_ADDRESS_BOOKS_STATE = "contacts:addressBooks:state";
const META_SESSION = "contacts:session";

function metaKeyForBookState(bookId: string): string {
  return `contacts:book:${bookId}:state`;
}

export async function readContactsBootstrapFromCache(
  username: string,
): Promise<ContactsAppBootstrap | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const sessionRow = await db.meta.get(META_SESSION);
  if (!sessionRow?.value) return null;

  const books = await db.contacts_address_books.toArray();
  const cards = await db.contacts_cards.toArray();
  if (books.length === 0 && cards.length === 0) return null;

  const session = JSON.parse(sessionRow.value) as ContactsAppBootstrap["session"];
  const addressBooks = books.map((row) => JSON.parse(row.data) as AddressBook);
  const contactCards = cards.map((row) => JSON.parse(row.data) as ContactCard);

  return {
    session,
    data: { addressBooks, cards: contactCards },
  };
}

export async function writeContactsBootstrapToCache(
  username: string,
  bootstrap: ContactsAppBootstrap,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const pendingRows = await db.contacts_cards.filter((row) => row.pendingSync).toArray();
  await db.meta.put({ key: META_SESSION, value: JSON.stringify(bootstrap.session) });
  rememberOfflineContactsUsername(username);
  await db.contacts_address_books.clear();
  await db.contacts_address_books.bulkPut(
    bootstrap.data.addressBooks.map((book) => ({
      id: book.id ?? "default",
      data: JSON.stringify(book),
    })),
  );
  await db.contacts_cards.clear();
  await db.contacts_cards.bulkPut(
    bootstrap.data.cards.map((card) => {
      const addressBookId =
        Object.keys(card.addressBookIds ?? {}).find((k) => card.addressBookIds?.[k]) ?? "default";
      return {
        id: card.id,
        addressBookId,
        data: JSON.stringify(card),
        pendingSync: false,
      };
    }),
  );
  if (pendingRows.length > 0) {
    await db.contacts_cards.bulkPut(pendingRows);
  }
}

export async function upsertContactCardInCache(
  username: string,
  card: ContactCard,
  pendingSync = false,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const addressBookId =
    Object.keys(card.addressBookIds ?? {}).find((k) => card.addressBookIds?.[k]) ?? "default";
  await db.contacts_cards.put({
    id: card.id,
    addressBookId,
    data: JSON.stringify(card),
    pendingSync,
  });
}

export async function removeContactCardFromCache(username: string, cardId: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.contacts_cards.delete(cardId);
}

export async function readSyncToken(username: string, bookId: string): Promise<string | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const row = await db.meta.get(metaKeyForBookState(bookId));
  return row?.value ?? null;
}

export async function writeSyncToken(
  username: string,
  bookId: string,
  token: string,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.meta.put({ key: metaKeyForBookState(bookId), value: token });
}

export async function readAddressBooksSyncToken(username: string): Promise<string | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const row = await db.meta.get(META_ADDRESS_BOOKS_STATE);
  return row?.value ?? null;
}

export async function writeAddressBooksSyncToken(username: string, token: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.meta.put({ key: META_ADDRESS_BOOKS_STATE, value: token });
}

export async function enqueueOutboxMutation(
  username: string,
  row: Omit<OfflineOutboxRow, "createdAt" | "retries">,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.outbox.put({
    ...row,
    createdAt: Date.now(),
    retries: 0,
  });
}

export async function listOutboxMutations(username: string): Promise<OfflineOutboxRow[]> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  return db.outbox.orderBy("createdAt").toArray();
}

export async function removeOutboxMutation(username: string, id: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.outbox.delete(id);
}

export async function markOutboxError(username: string, id: string, error: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const row = await db.outbox.get(id);
  if (!row) return;
  await db.outbox.put({
    ...row,
    retries: row.retries + 1,
    lastError: error,
  });
}

export function createTempContactId(): string {
  return `local-${crypto.randomUUID().replace(/-/g, "")}`;
}
