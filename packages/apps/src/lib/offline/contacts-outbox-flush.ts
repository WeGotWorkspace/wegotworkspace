import type { ContactCardCreate, ContactCardPatch } from "@/contacts-core/src/contacts-types";
import { contactCardSet, ContactStateMismatchError } from "@/lib/api/wgw/contacts-set";
import { getCard } from "@/lib/api/wgw/contacts";
import { pullAddressBookChanges, syncAllContactBooks } from "@/lib/api/wgw/contacts-sync";
import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { CONTACTS_DOMAIN } from "@/lib/offline/contacts/contacts-schema";
import {
  listOutboxMutations,
  markOutboxError,
  readCachedAddressBooks,
  readContactsBootstrapFromCache,
  removeOutboxMutation,
  removeContactCardFromCache,
  upsertContactCardInCache,
  writeContactsBootstrapToCache,
} from "@/lib/offline/contacts-offline-store";

export type OutboxFlushResult = {
  stateMismatches: string[];
  bootstrap: ContactsAppBootstrap | null;
};

export async function flushContactsOutbox(username: string): Promise<OutboxFlushResult> {
  const cached = await readContactsBootstrapFromCache(username);
  if (!cached) {
    return { stateMismatches: [], bootstrap: null };
  }

  const rows = await listOutboxMutations(username);
  const stateMismatches: string[] = [];

  for (const row of rows) {
    if (row.domain !== CONTACTS_DOMAIN) continue;
    try {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      if (row.op === "create") {
        const creationId = String(payload.creationId ?? row.id);
        const body = payload.body as ContactCardCreate;
        const response = await contactCardSet({ create: { [creationId]: body } });
        const serverId = response.created[creationId];
        if (!serverId) {
          throw new Error(response.notCreated[creationId]?.description ?? "Create failed");
        }
        const tempId = String(payload.tempCardId ?? "");
        if (tempId) await removeContactCardFromCache(username, tempId);
        const card = await getCard(serverId);
        await upsertContactCardInCache(username, card, false);
      } else if (row.op === "update") {
        const cardId = String(payload.cardId ?? "");
        const patch = payload.patch as ContactCardPatch;
        const updateEntry: ContactCardPatch & { ifInState?: string } = { ...patch };
        if (row.ifInState) updateEntry.ifInState = row.ifInState;
        const response = await contactCardSet({ update: { [cardId]: updateEntry } });
        if (response.notUpdated[cardId]?.type === "stateMismatch") {
          stateMismatches.push(cardId);
          await markOutboxError(username, row.id, "stateMismatch");
          continue;
        }
        const card = await getCard(cardId);
        await upsertContactCardInCache(username, card, false);
      } else if (row.op === "delete") {
        const cardId = String(payload.cardId ?? "");
        const destroy = row.ifInState ? { [cardId]: { ifInState: row.ifInState } } : [cardId];
        const response = await contactCardSet({ destroy });
        if (response.notDestroyed[cardId]?.type === "stateMismatch") {
          stateMismatches.push(cardId);
          await markOutboxError(username, row.id, "stateMismatch");
          continue;
        }
        await removeContactCardFromCache(username, cardId);
      }
      await removeOutboxMutation(username, row.id);
    } catch (error) {
      if (error instanceof ContactStateMismatchError) {
        stateMismatches.push(error.cardId);
        await markOutboxError(username, row.id, "stateMismatch");
        continue;
      }
      await markOutboxError(
        username,
        row.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  await pullAddressBookChanges(username);

  const books = await readCachedAddressBooks(username);
  const bookIds = books.map((b) => b.id).filter((id): id is string => Boolean(id && id.length > 0));
  if (bookIds.length > 0) {
    await syncAllContactBooks(username, bookIds);
  }

  const nextBootstrap = await readContactsBootstrapFromCache(username);
  if (nextBootstrap) {
    nextBootstrap.session = cached.session;
    nextBootstrap.data.addressBooks = books;
    await writeContactsBootstrapToCache(username, nextBootstrap);
  }

  return { stateMismatches, bootstrap: nextBootstrap };
}
