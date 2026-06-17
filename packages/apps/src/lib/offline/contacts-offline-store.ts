import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { rememberOfflineContactsUsername } from "@/lib/offline/offline-session";
import type {
  AddressBook,
  ContactCard,
  ContactCardPatch,
} from "@/contacts-core/src/contacts-types";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { enqueueOutboxMutation } from "@/lib/offline/core/outbox-store";
import type { OfflineOutboxRow } from "@/lib/offline/core/types";
import {
  CONTACTS_DOMAIN,
  contactsBooksTable,
  contactsCardsTable,
  type OfflineContactCardRow,
} from "@/lib/offline/contacts/contacts-schema";

export {
  enqueueOutboxMutation,
  listOutboxMutations,
  markOutboxError,
  removeOutboxMutation,
} from "@/lib/offline/core/outbox-store";

const META_ADDRESS_BOOKS_STATE = "contacts:addressBooks:state";
const META_SESSION = "contacts:session";

function metaKeyForBookState(bookId: string): string {
  return `contacts:book:${bookId}:state`;
}

function contactCardRow(card: ContactCard, pendingSync: boolean): OfflineContactCardRow {
  const addressBookId =
    Object.keys(card.addressBookIds ?? {}).find((k) => card.addressBookIds?.[k]) ?? "default";
  return {
    id: card.id,
    addressBookId,
    data: JSON.stringify(card),
    pendingSync,
    updatedAt: Date.now(),
  };
}

export async function readContactsBootstrapFromCache(
  username: string,
): Promise<ContactsAppBootstrap | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const sessionRow = await db.meta.get(META_SESSION);
  if (!sessionRow?.value) return null;

  const books = await contactsBooksTable(db).toArray();
  const cards = await contactsCardsTable(db).toArray();
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
  const cards = contactsCardsTable(db);
  const books = contactsBooksTable(db);
  const pendingRows = await cards.filter((row) => row.pendingSync).toArray();
  await db.meta.put({ key: META_SESSION, value: JSON.stringify(bootstrap.session) });
  rememberOfflineContactsUsername(username);
  await books.clear();
  await books.bulkPut(
    bootstrap.data.addressBooks.map((book) => ({
      id: book.id ?? "default",
      data: JSON.stringify(book),
    })),
  );
  await cards.clear();
  await cards.bulkPut(bootstrap.data.cards.map((card) => contactCardRow(card, false)));
  if (pendingRows.length > 0) {
    await cards.bulkPut(pendingRows);
  }
}

export async function upsertContactCardInCache(
  username: string,
  card: ContactCard,
  pendingSync = false,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await contactsCardsTable(db).put(contactCardRow(card, pendingSync));
}

export async function removeContactCardFromCache(username: string, cardId: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await contactsCardsTable(db).delete(cardId);
}

/** Ids of cards with unsynced local changes (drives the pending-sync badge). */
export async function listPendingContactCardIds(username: string): Promise<string[]> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const rows = await contactsCardsTable(db)
    .filter((row) => row.pendingSync)
    .toArray();
  return rows.map((row) => row.id);
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

/** Card id targeted by an outbox row (update/delete `cardId`, or create `tempCardId`). */
export function contactsOutboxCardId(row: OfflineOutboxRow): string | null {
  if (row.domain !== CONTACTS_DOMAIN) return null;
  try {
    const payload = JSON.parse(row.payload) as {
      cardId?: string;
      tempCardId?: string;
      creationId?: string;
    };
    return payload.cardId ?? payload.tempCardId ?? payload.creationId ?? null;
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
  const rows = await db.outbox.where("domain").equals(CONTACTS_DOMAIN).sortBy("createdAt");
  const existing = rows.find((row) => row.op === "update" && contactsOutboxCardId(row) === cardId);

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
    domain: CONTACTS_DOMAIN,
    op: "update",
    payload: JSON.stringify({ cardId, patch }),
    ifInState,
  });
}

export function createTempContactId(): string {
  return `local-${crypto.randomUUID().replace(/-/g, "")}`;
}
