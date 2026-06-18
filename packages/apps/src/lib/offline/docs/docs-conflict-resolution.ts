import { isFetchNetworkError } from "@/lib/offline/core/browser-online";
import {
  listOutboxMutations,
  putOutboxMutation,
  removeOutboxMutation,
} from "@/lib/offline/core/outbox-store";
import {
  docsOutboxApiPath,
  removeFileFromCache,
  upsertFileInCache,
} from "@/lib/offline/docs/docs-offline-store";
import {
  fetchServerDocContent,
  flushDocsOutbox,
  type OutboxFlushResult,
} from "@/lib/offline/docs/docs-outbox-flush";

async function outboxRowsForPath(username: string, apiPath: string) {
  const rows = await listOutboxMutations(username);
  return rows.filter((row) => docsOutboxApiPath(row) === apiPath);
}

/**
 * "Keep local": clear the cached-base guard and re-flush so the local file wins.
 */
export async function resolveDocsConflictKeepLocal(
  username: string,
  apiPath: string,
): Promise<OutboxFlushResult> {
  const rows = await outboxRowsForPath(username, apiPath);
  for (const row of rows) {
    await putOutboxMutation(username, {
      ...row,
      ifInState: undefined,
      retries: 0,
      lastError: undefined,
    });
  }

  return flushDocsOutbox(username);
}

/**
 * "Use server": discard queued local changes and refresh the cached file from the server.
 */
export async function resolveDocsConflictUseServer(
  username: string,
  apiPath: string,
): Promise<void> {
  const rows = await outboxRowsForPath(username, apiPath);
  for (const row of rows) {
    await removeOutboxMutation(username, row.id);
  }

  try {
    const fresh = await fetchServerDocContent(apiPath);
    await upsertFileInCache(username, apiPath, fresh, false);
  } catch (error) {
    if (isFetchNetworkError(error)) throw error;
    await removeFileFromCache(username, apiPath);
  }
}
