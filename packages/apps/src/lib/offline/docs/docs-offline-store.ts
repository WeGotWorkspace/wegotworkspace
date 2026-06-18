import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import type { DocsDocument } from "@/docs-core/src/docs-types";
import { parentAndName } from "@/lib/files/api-path";
import { rememberOfflineDocsUsername } from "@/lib/offline/offline-session";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { enqueueCoalescedOutboxUpdate } from "@/lib/offline/core/outbox-coalescing";
import {
  isRetryableOutboxRow,
  listOutboxMutationsForDomain,
} from "@/lib/offline/core/outbox-store";
import type { OfflineOutboxRow } from "@/lib/offline/core/types";
import {
  DOCS_DOMAIN,
  docsFilesTable,
  type OfflineDocsFileRow,
} from "@/lib/offline/docs/docs-schema";

export {
  enqueueOutboxMutation,
  listOutboxMutations,
  markOutboxError,
  removeOutboxMutation,
} from "@/lib/offline/core/outbox-store";

const META_SESSION = "docs:session";

export type DocsSavePayload = {
  apiPath: string;
  content: string;
};

export type DocsRenamePayload = {
  apiPath: string;
  newName: string;
};

function metaKeyForFileState(apiPath: string): string {
  return `docs:file:${apiPath}:state`;
}

function fileRow(
  apiPath: string,
  content: string,
  pendingSync: boolean,
  serverRevision?: string,
): OfflineDocsFileRow {
  return {
    apiPath,
    content,
    cachedAt: Date.now(),
    pendingSync,
    serverRevision,
  };
}

function documentFromRow(row: OfflineDocsFileRow): DocsDocument {
  return {
    apiPath: row.apiPath,
    fileName: parentAndName(row.apiPath).from,
    content: row.content,
  };
}

export async function readDocsBootstrapFromCache(
  username: string,
): Promise<DocsAppBootstrap | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const sessionRow = await db.meta.get(META_SESSION);
  if (!sessionRow?.value) return null;

  const session = JSON.parse(sessionRow.value) as DocsAppBootstrap["session"];
  return { session, data: { document: null } };
}

export async function writeDocsBootstrapToCache(
  username: string,
  bootstrap: DocsAppBootstrap,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.meta.put({ key: META_SESSION, value: JSON.stringify(bootstrap.session) });
  rememberOfflineDocsUsername(username);
}

export async function readFileFromCache(
  username: string,
  apiPath: string,
): Promise<DocsDocument | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const row = await docsFilesTable(db).get(apiPath);
  return row ? documentFromRow(row) : null;
}

export async function upsertFileInCache(
  username: string,
  apiPath: string,
  content: string,
  pendingSync = false,
  serverRevision?: string,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const table = docsFilesTable(db);
  if (!pendingSync) {
    const existing = await table.get(apiPath);
    if (existing?.pendingSync) return;
  }
  await table.put(fileRow(apiPath, content, pendingSync, serverRevision));
}

export async function removeFileFromCache(username: string, apiPath: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await docsFilesTable(db).delete(apiPath);
  await db.meta.delete(metaKeyForFileState(apiPath));
}

export async function listPendingDocPaths(username: string): Promise<string[]> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const rows = await docsFilesTable(db)
    .filter((row) => row.pendingSync)
    .toArray();
  return rows.map((row) => row.apiPath);
}

export async function listFailedDocsOutbox(username: string): Promise<OfflineOutboxRow[]> {
  const rows = await listOutboxMutationsForDomain(username, DOCS_DOMAIN);
  return rows.filter(isRetryableOutboxRow);
}

export async function readFileSyncBaseline(
  username: string,
  apiPath: string,
): Promise<string | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const row = await db.meta.get(metaKeyForFileState(apiPath));
  return row?.value ?? null;
}

export async function writeFileSyncBaseline(
  username: string,
  apiPath: string,
  content: string,
): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.meta.put({ key: metaKeyForFileState(apiPath), value: content });
}

export function docsOutboxApiPath(row: OfflineOutboxRow): string | null {
  if (row.domain !== DOCS_DOMAIN) return null;
  try {
    const payload = JSON.parse(row.payload) as { apiPath?: string };
    return payload.apiPath ?? null;
  } catch {
    return null;
  }
}

export async function enqueueCoalescedDocSave(
  username: string,
  apiPath: string,
  content: string,
  baseContent?: string,
): Promise<void> {
  await enqueueCoalescedOutboxUpdate({
    username,
    domain: DOCS_DOMAIN,
    op: "save",
    entityId: apiPath,
    patch: content,
    ifInState: baseContent,
    mergePatches: (_existing, incoming) => incoming,
    entityIdFromRow: docsOutboxApiPath,
    buildUpdatePayload: (path, nextContent) => ({ apiPath: path, content: nextContent }),
    readPatchFromPayload: (payload) => String(payload.content ?? ""),
  });
}

export async function upsertEntityInCache(
  username: string,
  document: DocsDocument,
  pendingSync = false,
): Promise<void> {
  await upsertFileInCache(username, document.apiPath, document.content, pendingSync);
}

export async function removeEntityFromCache(username: string, apiPath: string): Promise<void> {
  await removeFileFromCache(username, apiPath);
}

export async function readSyncToken(username: string, scope: string): Promise<string | null> {
  return readFileSyncBaseline(username, scope);
}

export async function writeSyncToken(
  username: string,
  scope: string,
  token: string,
): Promise<void> {
  await writeFileSyncBaseline(username, scope, token);
}
