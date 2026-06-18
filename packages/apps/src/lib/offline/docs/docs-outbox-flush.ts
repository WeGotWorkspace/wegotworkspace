import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import { createWgwDocsDriveOperations } from "@/lib/offline/docs/docs-drive-operations";
import { readBrowserOnline } from "@/lib/offline/core/browser-online";
import { DOCS_DOMAIN } from "@/lib/offline/docs/docs-schema";
import {
  listOutboxMutations,
  markOutboxError,
  readDocsBootstrapFromCache,
  removeFileFromCache,
  removeOutboxMutation,
  type DocsRenamePayload,
  type DocsSavePayload,
  upsertFileInCache,
  writeDocsBootstrapToCache,
  writeFileSyncBaseline,
} from "@/lib/offline/docs/docs-offline-store";

export type OutboxFlushResult = {
  stateMismatches: string[];
  bootstrap: DocsAppBootstrap | null;
};

const networkOps = createWgwDocsDriveOperations();

async function fetchServerFileContent(apiPath: string): Promise<string> {
  return networkOps.loadFile(apiPath);
}

export async function flushDocsOutbox(username: string): Promise<OutboxFlushResult> {
  const cached = await readDocsBootstrapFromCache(username);
  if (!cached) {
    return { stateMismatches: [], bootstrap: null };
  }

  const rows = await listOutboxMutations(username);
  const stateMismatches: string[] = [];

  for (const row of rows) {
    if (row.domain !== DOCS_DOMAIN) continue;
    try {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      if (row.op === "save") {
        const save = payload as DocsSavePayload;
        const apiPath = save.apiPath;
        const content = save.content;
        if (row.ifInState) {
          const serverContent = await fetchServerFileContent(apiPath);
          if (serverContent !== row.ifInState) {
            stateMismatches.push(apiPath);
            await markOutboxError(username, row.id, "stateMismatch");
            continue;
          }
        }
        await networkOps.saveFile(apiPath, content);
        await upsertFileInCache(username, apiPath, content, false);
        await writeFileSyncBaseline(username, apiPath, content);
      } else if (row.op === "rename") {
        const rename = payload as DocsRenamePayload;
        const apiPath = rename.apiPath;
        const newName = rename.newName;
        const nextPath = await networkOps.renameFile(apiPath, newName);
        const cachedFile = await fetchServerFileContent(nextPath).catch(() => null);
        if (cachedFile !== null) {
          await upsertFileInCache(username, nextPath, cachedFile, false);
          await writeFileSyncBaseline(username, nextPath, cachedFile);
        }
        await removeFileFromCache(username, apiPath);
      }
      await removeOutboxMutation(username, row.id);
    } catch (error) {
      await markOutboxError(
        username,
        row.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  let nextBootstrap = await readDocsBootstrapFromCache(username);
  if (nextBootstrap && readBrowserOnline()) {
    nextBootstrap = { ...nextBootstrap, session: cached.session };
    await writeDocsBootstrapToCache(username, nextBootstrap);
  } else if (nextBootstrap) {
    nextBootstrap = { ...nextBootstrap, session: cached.session };
    await writeDocsBootstrapToCache(username, nextBootstrap);
  }

  return { stateMismatches, bootstrap: nextBootstrap };
}

/** Fetch a single file from the live Files API (used by conflict resolution). */
export async function fetchServerDocContent(apiPath: string): Promise<string> {
  return fetchServerFileContent(apiPath);
}
