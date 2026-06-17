import type { ContactCard } from "@/contacts-core/src/contacts-types";
import { wgwFetch, wgwReadJson } from "@/lib/api/wgw/http";
import { getCard } from "@/lib/api/wgw/contacts";
import {
  readSyncToken,
  removeContactCardFromCache,
  upsertContactCardInCache,
  writeSyncToken,
} from "@/lib/offline/contacts-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/offline-db";

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
  for (const id of changes.destroyed) {
    const row = await db.contacts_cards.get(id);
    if (row?.pendingSync) continue;
    await removeContactCardFromCache(username, id);
  }
  const toFetch = [...changes.created, ...changes.updated];
  for (const id of toFetch) {
    const row = await db.contacts_cards.get(id);
    if (row?.pendingSync) continue;
    const card = await getCard(id, opts);
    await upsertContactCardInCache(username, card, false);
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
