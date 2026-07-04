import type { ContactCard } from "@/contacts-core/src/contacts-types";
import { wgwFetch, wgwReadJson } from "@/lib/api/wgw/http";
import { getAddressBook, getCard, listAddressBooks } from "@/lib/api/wgw/contacts";
import {
  listCachedAddressBookIds,
  readAddressBooksSyncToken,
  readSyncToken,
  removeAddressBookFromCache,
  removeContactCardFromCache,
  replaceAllAddressBooksInCache,
  upsertAddressBookInCache,
  upsertContactCardInCache,
  writeAddressBooksSyncToken,
  writeSyncToken,
} from "@/lib/offline/contacts-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { contactsCardsTable } from "@/lib/offline/contacts/contacts-schema";

type JmapChangesResponse = {
  oldState: string;
  newState: string;
  created: string[];
  updated: string[];
  destroyed: string[];
};

export async function pullContactCardChangesForBook(
  username: string,
  addressBookId: string,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const since = (await readSyncToken(username, addressBookId)) ?? "0";
  const query = new URLSearchParams({
    addressBookId,
    since,
  });
  const res = await wgwFetch(`/contacts/cards/changes?${query.toString()}`, {
    signal: opts?.signal,
  });
  if (!res.ok) {
    if (res.status === 400) {
      await fullResyncBook(username, addressBookId, opts);
      return;
    }
    throw new Error(`GET /contacts/cards/changes failed (${res.status})`);
  }
  const changes = (await wgwReadJson(res)) as JmapChangesResponse;
  await applyContactCardChanges(username, addressBookId, changes, opts);
  await writeSyncToken(username, addressBookId, changes.newState);
}

async function fullResyncBook(
  username: string,
  addressBookId: string,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const res = await wgwFetch(`/contacts/cards?addressBookId=${encodeURIComponent(addressBookId)}`, {
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`GET /contacts/cards failed (${res.status})`);
  const json = (await wgwReadJson(res)) as { list?: ContactCard[] };
  const list = json.list ?? [];
  for (const card of list) {
    await upsertContactCardInCache(username, card, false);
  }
  await pullContactCardChangesForBook(username, addressBookId, opts);
}

async function applyContactCardChanges(
  username: string,
  addressBookId: string,
  changes: JmapChangesResponse,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const cards = contactsCardsTable(db);
  for (const id of changes.destroyed) {
    const row = await cards.get(id);
    if (row?.pendingSync) continue;
    await removeContactCardFromCache(username, id);
  }
  const toFetch = [...changes.created, ...changes.updated];
  for (const id of toFetch) {
    const row = await cards.get(id);
    if (row?.pendingSync) continue;
    const card = await getCard(id, opts);
    await upsertContactCardInCache(username, card, false);
  }
}

export async function pullAddressBookChanges(
  username: string,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const since = (await readAddressBooksSyncToken(username)) ?? "0";
  const query = new URLSearchParams({ since });
  const res = await wgwFetch(`/contacts/addressbooks/changes?${query.toString()}`, {
    signal: opts?.signal,
  });
  if (!res.ok) {
    if (res.status === 400) {
      await fullResyncAddressBooks(username, opts);
      return;
    }
    throw new Error(`GET /contacts/addressbooks/changes failed (${res.status})`);
  }
  const changes = (await wgwReadJson(res)) as JmapChangesResponse;
  await applyAddressBookChanges(username, changes, opts);
  await writeAddressBooksSyncToken(username, changes.newState);
}

async function fullResyncAddressBooks(
  username: string,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const books = await listAddressBooks(opts);
  await replaceAllAddressBooksInCache(username, books);
  await writeAddressBooksSyncToken(username, "0");
  await pullAddressBookChanges(username, opts);
}

async function applyAddressBookChanges(
  username: string,
  changes: JmapChangesResponse,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  for (const bookId of changes.destroyed) {
    await removeAddressBookFromCache(username, bookId);
  }
  for (const bookId of changes.created) {
    const book = await getAddressBook(bookId, opts);
    await upsertAddressBookInCache(username, book);
    await pullContactCardChangesForBook(username, bookId, opts);
  }
  for (const bookId of changes.updated) {
    await pullContactCardChangesForBook(username, bookId, opts);
  }
}

export async function syncAllContactBooks(
  username: string,
  addressBookIds: string[],
  opts?: { signal?: AbortSignal },
): Promise<void> {
  for (const bookId of addressBookIds) {
    await pullContactCardChangesForBook(username, bookId, opts);
  }
}

export async function syncContactBooksAfterAddressBookChanges(
  username: string,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await pullAddressBookChanges(username, opts);
  const bookIds = await listCachedAddressBookIds(username);
  if (bookIds.length > 0) {
    await syncAllContactBooks(username, bookIds, opts);
  }
}
