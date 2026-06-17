import { getCard } from "@/lib/api/wgw/contacts";
import { isFetchNetworkError } from "@/lib/offline/core/browser-online";
import {
  listOutboxMutations,
  putOutboxMutation,
  removeOutboxMutation,
} from "@/lib/offline/core/outbox-store";
import {
  contactsOutboxCardId,
  removeContactCardFromCache,
  upsertContactCardInCache,
} from "@/lib/offline/contacts-offline-store";
import { flushContactsOutbox, type OutboxFlushResult } from "@/lib/offline/contacts-outbox-flush";

function cardState(card: { state?: string }): string | undefined {
  return card.state;
}

async function outboxRowsForCard(username: string, cardId: string) {
  const rows = await listOutboxMutations(username);
  return rows.filter((row) => contactsOutboxCardId(row) === cardId);
}

/**
 * "Keep mine": rebase the queued mutation onto the current server state and
 * re-push it. Fetches the fresh card to read its latest `state`, rewrites the
 * pending outbox row's `ifInState`, clears the conflict error, then flushes.
 */
export async function resolveConflictKeepLocal(
  username: string,
  cardId: string,
): Promise<OutboxFlushResult> {
  const fresh = await getCard(cardId);
  const freshState = cardState(fresh);

  const rows = await outboxRowsForCard(username, cardId);
  for (const row of rows) {
    if (row.op !== "update" && row.op !== "delete") continue;
    await putOutboxMutation(username, {
      ...row,
      ifInState: freshState,
      retries: 0,
      lastError: undefined,
    });
  }

  return flushContactsOutbox(username);
}

/**
 * "Use server": discard the local pending change. Drops the queued outbox
 * row(s) for the card and refreshes the cached card from the server (or removes
 * it from cache when the server reports it gone).
 */
export async function resolveConflictUseServer(username: string, cardId: string): Promise<void> {
  const rows = await outboxRowsForCard(username, cardId);
  for (const row of rows) {
    await removeOutboxMutation(username, row.id);
  }

  try {
    const fresh = await getCard(cardId);
    await upsertContactCardInCache(username, fresh, false);
  } catch (error) {
    if (isFetchNetworkError(error)) throw error;
    // Server says the card is gone (or otherwise unavailable): drop it locally.
    await removeContactCardFromCache(username, cardId);
  }
}
