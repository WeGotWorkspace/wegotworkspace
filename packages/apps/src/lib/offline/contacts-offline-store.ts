import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { rememberOfflineContactsUsername } from "@/lib/offline/offline-session";
import type {
  AddressBook,
  ContactCard,
  ContactCardPatch,
} from "@/contacts-core/src/contacts-types";
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

function mergeContactPatches(a: ContactCardPatch, b: ContactCardPatch): ContactCardPatch {
  return {
    ...a,
    ...b,
    name: b.name ? { ...a.name, ...b.name } : a.name,
    emails: b.emails ? { ...a.emails, ...b.emails } : a.emails,
    phones: b.phones ? { ...a.phones, ...b.phones } : a.phones,
    addresses: b.addresses ? { ...a.addresses, ...b.addresses } : a.addresses,
    members: b.members ? { ...a.members, ...b.members } : a.members,
  };
}

function outboxUpdateCardId(row: OfflineOutboxRow): string | null {
  if (row.domain !== "contacts" || row.op !== "update") return null;
  try {
    const payload = JSON.parse(row.payload) as { cardId?: string };
    return payload.cardId ?? null;
  } catch {
    return null;
  }
}

/** Merges pending update rows for the same card so flush sends one patch with the original ifInState. */
export async function enqueueCoalescedContactUpdate(
  username: string,
  cardId: string,
  patch: ContactCardPatch,
  ifInState: string | undefined,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const rows = await db.outbox.where("domain").equals("contacts").sortBy("createdAt");
  const existing = rows.find((row) => row.op === "update" && outboxUpdateCardId(row) === cardId);

  if (existing) {
    const payload = JSON.parse(existing.payload) as { cardId: string; patch: ContactCardPatch };
    const mergedPatch = mergeContactPatches(payload.patch, patch);
    await db.outbox.put({
      ...existing,
      payload: JSON.stringify({ cardId, patch: mergedPatch }),
    });
    return;
  }

  await enqueueOutboxMutation(username, {
    id: crypto.randomUUID(),
    domain: "contacts",
    op: "update",
    payload: JSON.stringify({ cardId, patch }),
    ifInState,
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
