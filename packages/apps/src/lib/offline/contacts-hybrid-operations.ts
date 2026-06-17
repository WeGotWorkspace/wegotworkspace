import type {
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
  ContactsAPIOperations,
  ContactsMutationOpts,
} from "@/contacts-core/src/contacts-types";
import { fetchContactsLiveBootstrap } from "@/lib/api/wgw/contacts-bootstrap";
import {
  createCardWithState,
  deleteCardWithState,
  patchCardWithState,
} from "@/lib/api/wgw/contacts-mutations";
import {
  downloadCardVcf,
  getCard,
  importVcards,
  listAddressBooks,
  listCards,
} from "@/lib/api/wgw/contacts";
import { syncAllContactBooks } from "@/lib/api/wgw/contacts-sync";
import { isFetchNetworkError, readBrowserOnline } from "@/lib/offline/browser-online";
import { flushContactsOutbox } from "@/lib/offline/contacts-outbox-flush";
import {
  createTempContactId,
  enqueueOutboxMutation,
  readContactsBootstrapFromCache,
  removeContactCardFromCache,
  upsertContactCardInCache,
  writeContactsBootstrapToCache,
} from "@/lib/offline/contacts-offline-store";
import { readOfflineContactsUsername } from "@/lib/offline/offline-session";
import { ConnectivitySyncRunner } from "@/lib/offline/connectivity-sync-runner";

function mergePatch(card: ContactCard, patch: ContactCardPatch): ContactCard {
  return {
    ...card,
    ...patch,
    name: patch.name ? { ...card.name, ...patch.name } : card.name,
    emails: patch.emails ? { ...card.emails, ...patch.emails } : card.emails,
    phones: patch.phones ? { ...card.phones, ...patch.phones } : card.phones,
    addresses: patch.addresses ? { ...card.addresses, ...patch.addresses } : patch.addresses,
    members: patch.members ? { ...patch.members, ...patch.members } : card.members,
  } as ContactCard;
}

function concurrencyToken(card: ContactCard, opts?: ContactsMutationOpts): string | undefined {
  const state = (card as ContactCard & { state?: string }).state;
  return opts?.ifInState ?? state;
}

function rethrowUnlessOfflineQueue(error: unknown, opts?: ContactsMutationOpts): void {
  if (opts?.signal?.aborted) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  if (!isFetchNetworkError(error)) throw error;
}

const runners = new Map<string, ConnectivitySyncRunner>();

function runnerFor(username: string): ConnectivitySyncRunner {
  const existing = runners.get(username);
  if (existing) return existing;
  const runner = new ConnectivitySyncRunner(async () => {
    await flushContactsOutbox(username);
  });
  runners.set(username, runner);
  return runner;
}

async function resolveCachedCard(
  username: string,
  cardId: string,
  opts?: ContactsMutationOpts,
): Promise<ContactCard | undefined> {
  const cached = await readContactsBootstrapFromCache(username);
  const fromCache = cached?.data.cards.find((c) => c.id === cardId);
  if (fromCache || !readBrowserOnline()) return fromCache;

  try {
    return await getCard(cardId, opts);
  } catch (error) {
    if (isFetchNetworkError(error)) return fromCache;
    throw error;
  }
}

async function queueOfflineCreate(username: string, body: ContactCardCreate): Promise<ContactCard> {
  const tempId = createTempContactId();
  const optimistic = {
    ...body,
    id: tempId,
    "@type": "Card",
    version: "1.0",
    uid: body.uid ?? `urn:uuid:${crypto.randomUUID()}`,
    state: `local-state-${tempId}`,
  } as ContactCard;
  await upsertContactCardInCache(username, optimistic, true);
  await enqueueOutboxMutation(username, {
    id: crypto.randomUUID(),
    domain: "contacts",
    op: "create",
    payload: JSON.stringify({
      creationId: tempId,
      tempCardId: tempId,
      body,
    }),
  });
  return optimistic;
}

async function queueOfflinePatch(
  username: string,
  cardId: string,
  patch: ContactCardPatch,
  existing: ContactCard,
  opts?: ContactsMutationOpts,
): Promise<ContactCard> {
  const token = concurrencyToken(existing, opts);
  const optimistic = mergePatch(existing, patch);
  await upsertContactCardInCache(username, optimistic, true);
  await enqueueOutboxMutation(username, {
    id: crypto.randomUUID(),
    domain: "contacts",
    op: "update",
    payload: JSON.stringify({ cardId, patch }),
    ifInState: token,
  });
  return optimistic;
}

async function queueOfflineDelete(
  username: string,
  cardId: string,
  token: string | undefined,
): Promise<void> {
  await removeContactCardFromCache(username, cardId);
  await enqueueOutboxMutation(username, {
    id: crypto.randomUUID(),
    domain: "contacts",
    op: "delete",
    payload: JSON.stringify({ cardId }),
    ifInState: token,
  });
}

export function createHybridContactsOperations(username: string): ContactsAPIOperations {
  const runner = runnerFor(username);

  return {
    listAddressBooks: (opts) => listAddressBooks(opts),
    listCards: async (opts) => {
      const cached = await readContactsBootstrapFromCache(username);
      if (cached && !readBrowserOnline()) {
        if (opts?.addressBookId) {
          const bookId = opts.addressBookId;
          return cached.data.cards.filter((c) => Boolean(c.addressBookIds?.[bookId]));
        }
        return cached.data.cards;
      }
      return listCards(opts);
    },
    getCard: async (cardId, opts) => {
      const cached = await readContactsBootstrapFromCache(username);
      if (cached && !readBrowserOnline()) {
        const found = cached.data.cards.find((c) => c.id === cardId);
        if (found) return found;
      }
      return getCard(cardId, opts);
    },
    createCard: async (body, opts) => {
      if (!readBrowserOnline()) {
        return queueOfflineCreate(username, body);
      }
      try {
        const card = await createCardWithState(body, opts);
        await upsertContactCardInCache(username, card, false);
        await runner.flush();
        return card;
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts);
        return queueOfflineCreate(username, body);
      }
    },
    patchCard: async (cardId, patch, opts) => {
      const existing = await resolveCachedCard(username, cardId, opts);
      if (!existing) {
        throw new Error(
          !readBrowserOnline() ? "Contact not found in cache while offline" : "Contact not found",
        );
      }
      if (!readBrowserOnline()) {
        return queueOfflinePatch(username, cardId, patch, existing, opts);
      }
      const token = concurrencyToken(existing, opts);
      try {
        const card = await patchCardWithState(cardId, patch, {
          ...opts,
          ifInState: token,
        });
        await upsertContactCardInCache(username, card, false);
        await runner.flush();
        return card;
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts);
        return queueOfflinePatch(username, cardId, patch, existing, opts);
      }
    },
    deleteCard: async (cardId, opts) => {
      const cached = await readContactsBootstrapFromCache(username);
      const existing = cached?.data.cards.find((c) => c.id === cardId);
      const token = existing ? concurrencyToken(existing, opts) : opts?.ifInState;
      if (!readBrowserOnline()) {
        await queueOfflineDelete(username, cardId, token);
        return;
      }
      try {
        await deleteCardWithState(cardId, { ...opts, ifInState: token });
        await removeContactCardFromCache(username, cardId);
        await runner.flush();
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts);
        await queueOfflineDelete(username, cardId, token);
      }
    },
    downloadCardVcf,
    importVcards: async (vcardText, opts) => {
      if (!readBrowserOnline()) {
        throw new Error("vCard import requires an internet connection");
      }
      return importVcards(vcardText, opts);
    },
  };
}

export async function fetchContactsHybridBootstrap(): Promise<
  Awaited<ReturnType<typeof fetchContactsLiveBootstrap>>
> {
  const bootstrap = await fetchContactsLiveBootstrap();
  const username = bootstrap.session.user.username;
  if (!username) {
    throw new Error("Contacts bootstrap missing username");
  }
  if (readBrowserOnline()) {
    await flushContactsOutbox(username);
  }
  await writeContactsBootstrapToCache(username, bootstrap);
  const bookIds = bootstrap.data.addressBooks.map((b) => b.id).filter((id) => id.length > 0);
  if (bookIds.length > 0 && readBrowserOnline()) {
    await syncAllContactBooks(username, bookIds);
    const cached = await readContactsBootstrapFromCache(username);
    if (cached) {
      cached.session = bootstrap.session;
      cached.data.addressBooks = bootstrap.data.addressBooks;
      await writeContactsBootstrapToCache(username, cached);
      return cached;
    }
  }
  return bootstrap;
}

export async function loadContactsBootstrapHybrid(): Promise<
  Awaited<ReturnType<typeof fetchContactsLiveBootstrap>>
> {
  if (!readBrowserOnline()) {
    const username = readOfflineContactsUsername();
    if (username) {
      const cached = await readContactsBootstrapFromCache(username);
      if (cached) return cached;
    }
    throw new Error("No cached contacts available offline");
  }

  return fetchContactsHybridBootstrap();
}

export function getContactsSyncRunner(username: string): ConnectivitySyncRunner {
  return runnerFor(username);
}
