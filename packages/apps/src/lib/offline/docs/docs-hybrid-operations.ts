import { wgwFetchPrincipal } from "@/lib/api/wgw/http";
import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import type { DocsAPIOperations } from "@/docs-core/src/docs-types";
import { parentAndName } from "@/lib/files/api-path";
import { isFetchNetworkError, readBrowserOnline } from "@/lib/offline/core/browser-online";
import { createWgwDocsDriveOperations } from "@/lib/offline/docs/docs-drive-operations";
import {
  enqueueCoalescedDocSave,
  enqueueOutboxMutation,
  readDocsBootstrapFromCache,
  readFileFromCache,
  readFileSyncBaseline,
  removeFileFromCache,
  upsertFileInCache,
  writeDocsBootstrapToCache,
  writeFileSyncBaseline,
} from "@/lib/offline/docs/docs-offline-store";
import { DOCS_DOMAIN } from "@/lib/offline/docs/docs-schema";
import { flushDocsOutbox, type OutboxFlushResult } from "@/lib/offline/docs/docs-outbox-flush";
import { reportDocsSyncConflicts } from "@/lib/offline/docs/docs-sync-conflicts";
import { readOfflineDocsUsername } from "@/lib/offline/offline-session";
import {
  ConnectivitySyncRunner,
  ConnectivitySyncRunnerRegistry,
} from "@/lib/offline/core/connectivity-sync-runner";

const networkOps = createWgwDocsDriveOperations();

function rethrowUnlessOfflineQueue(error: unknown, signal?: AbortSignal): void {
  if (signal?.aborted) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  if (!isFetchNetworkError(error)) throw error;
}

const syncRunnerRegistry = new ConnectivitySyncRunnerRegistry<OutboxFlushResult>();

async function flushDocsOutboxAndReport(username: string): Promise<OutboxFlushResult> {
  const result = await flushDocsOutbox(username);
  reportDocsSyncConflicts(result.stateMismatches);
  return result;
}

function runnerFor(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return syncRunnerRegistry.getOrCreate(username, async () => flushDocsOutboxAndReport(username));
}

async function loadFileHybrid(
  username: string,
  apiPath: string,
  opts?: { signal?: AbortSignal },
): Promise<string> {
  if (!readBrowserOnline()) {
    const cached = await readFileFromCache(username, apiPath);
    if (cached) return cached.content;
    throw new Error("No cached document available offline");
  }

  try {
    const content = await networkOps.loadFile(apiPath, opts);
    await upsertFileInCache(username, apiPath, content, false);
    await writeFileSyncBaseline(username, apiPath, content);
    return content;
  } catch (error) {
    if (isFetchNetworkError(error)) {
      const cached = await readFileFromCache(username, apiPath);
      if (cached) return cached.content;
    }
    throw error;
  }
}

async function queueOfflineSave(username: string, apiPath: string, content: string): Promise<void> {
  const baseline = (await readFileSyncBaseline(username, apiPath)) ?? undefined;
  await upsertFileInCache(username, apiPath, content, true);
  await enqueueCoalescedDocSave(username, apiPath, content, baseline);
}

async function saveFileOnline(
  username: string,
  apiPath: string,
  content: string,
  runner: ConnectivitySyncRunner<OutboxFlushResult>,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await networkOps.saveFile(apiPath, content, opts);
  await upsertFileInCache(username, apiPath, content, false);
  await writeFileSyncBaseline(username, apiPath, content);
  await runner.flush();
}

export function createHybridDocsOperations(username: string): DocsAPIOperations {
  const runner = runnerFor(username);

  return {
    loadFile: (apiPath, opts) => loadFileHybrid(username, apiPath, opts),
    saveFile: async (apiPath, content, opts) => {
      if (!readBrowserOnline()) {
        await queueOfflineSave(username, apiPath, content);
        return;
      }
      try {
        await saveFileOnline(username, apiPath, content, runner, opts);
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        await queueOfflineSave(username, apiPath, content);
      }
    },
    renameFile: async (apiPath, newName, opts) => {
      const { destination } = parentAndName(apiPath);
      const nextPath = destination === "/" ? `/${newName}` : `${destination}/${newName}`;

      if (!readBrowserOnline()) {
        const cached = await readFileFromCache(username, apiPath);
        if (cached) {
          await upsertFileInCache(username, nextPath, cached.content, true);
          await removeFileFromCache(username, apiPath);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: DOCS_DOMAIN,
          op: "rename",
          payload: JSON.stringify({ apiPath, newName }),
        });
        return nextPath;
      }

      try {
        const savedPath = await networkOps.renameFile(apiPath, newName, opts);
        const cached = await readFileFromCache(username, apiPath);
        if (cached) {
          await upsertFileInCache(username, savedPath, cached.content, false);
          await removeFileFromCache(username, apiPath);
        }
        await runner.flush();
        return savedPath;
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const cached = await readFileFromCache(username, apiPath);
        if (cached) {
          await upsertFileInCache(username, nextPath, cached.content, true);
          await removeFileFromCache(username, apiPath);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: DOCS_DOMAIN,
          op: "rename",
          payload: JSON.stringify({ apiPath, newName }),
        });
        return nextPath;
      }
    },
  };
}

async function fetchDocsLiveBootstrap(): Promise<DocsAppBootstrap> {
  const session = await wgwFetchPrincipal();
  return { session, data: { document: null } };
}

export async function fetchDocsHybridBootstrap(): Promise<DocsAppBootstrap> {
  const bootstrap = await fetchDocsLiveBootstrap();
  const username = bootstrap.session.user.username;
  if (!username) {
    throw new Error("Docs bootstrap missing username");
  }
  if (readBrowserOnline()) {
    await flushDocsOutboxAndReport(username);
  }
  await writeDocsBootstrapToCache(username, bootstrap);
  return bootstrap;
}

export async function loadDocsBootstrapHybrid(): Promise<DocsAppBootstrap> {
  if (!readBrowserOnline()) {
    const username = readOfflineDocsUsername();
    if (username) {
      const cached = await readDocsBootstrapFromCache(username);
      if (cached) return cached;
    }
    throw new Error("No cached docs session available offline");
  }

  return fetchDocsHybridBootstrap();
}

export function getDocsSyncRunner(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return runnerFor(username);
}
