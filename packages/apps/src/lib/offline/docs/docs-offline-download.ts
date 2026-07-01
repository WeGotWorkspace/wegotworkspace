import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { normalizeApiVirtualPath } from "@/drive-core/src/drive-path-utils";
import { listOutboxMutationsForDomain } from "@/lib/offline/core/outbox-store";
import { DOCS_DOMAIN } from "@/lib/offline/docs/docs-schema";
import type { DocsOutboxPayload } from "@/lib/offline/docs/docs-outbox-flush";
import { normalizeDocsAvailabilityPath } from "@/lib/offline/docs/docs-availability-store";
import { docsCollabRoomKey } from "@/text-editor-core/docs-collab/docs-collab-persistence";
import { readContentFromYDoc } from "@/text-editor-core/docs-collab/docs-collab-editor-surface";
import {
  collabDocumentFormat,
  isYDocEmpty,
} from "@/text-editor-core/docs-collab/docs-collab-utils";

function parseOutboxPayload(payload: string): DocsOutboxPayload | null {
  try {
    return JSON.parse(payload) as DocsOutboxPayload;
  } catch {
    return null;
  }
}

async function readOutboxCreateContent(username: string, apiPath: string): Promise<string | null> {
  const normalized = normalizeDocsAvailabilityPath(apiPath);
  const rows = await listOutboxMutationsForDomain(username, DOCS_DOMAIN);
  for (const row of rows) {
    const payload = parseOutboxPayload(row.payload);
    if (payload?.op === "create" && normalizeDocsAvailabilityPath(payload.apiPath) === normalized) {
      return payload.content;
    }
  }
  return null;
}

async function readCollabRoomContent(roomKey: string, apiPath: string): Promise<string | null> {
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(roomKey, ydoc);
  try {
    await persistence.whenSynced;
    if (isYDocEmpty(ydoc)) return null;
    const format = collabDocumentFormat(apiPath);
    return readContentFromYDoc(ydoc, format);
  } catch {
    return null;
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
}

async function readCollabOfflineContent(apiPath: string): Promise<string | null> {
  const room = docsCollabRoomKey(apiPath);
  if (!room || !isDocsCollabEditablePath(room)) return null;

  const content = await readCollabRoomContent(room, apiPath);
  if (content != null) return content;

  const legacy = apiPath.trim().startsWith("/") ? room : `/${room}`;
  if (legacy !== room) {
    return readCollabRoomContent(legacy, apiPath);
  }
  return null;
}

function contentBlobForPath(apiPath: string, content: string): Blob {
  const fileName = apiPath.split("/").pop() ?? "download";
  const isPlainText = fileName.toLowerCase().endsWith(".txt");
  const mime = isPlainText ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";
  return new Blob([content], { type: mime });
}

export function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Read offline document bytes from collab persistence or a queued create mutation. */
export async function readOfflineDocsFileBlob(
  username: string,
  apiPath: string,
): Promise<Blob | null> {
  const normalized = normalizeApiVirtualPath(apiPath);
  const collabContent = await readCollabOfflineContent(normalized);
  if (collabContent != null) {
    return contentBlobForPath(normalized, collabContent);
  }
  const queuedContent = await readOutboxCreateContent(username, normalized);
  if (queuedContent != null) {
    return contentBlobForPath(normalized, queuedContent);
  }
  return null;
}

/** Download a pinned or queued Docs file while offline. */
export async function downloadOfflineDocsFile(username: string, apiPath: string): Promise<void> {
  const normalized = normalizeApiVirtualPath(apiPath);
  const blob = await readOfflineDocsFileBlob(username, normalized);
  if (!blob) {
    throw new Error("This file is not available offline.");
  }
  const filename = normalized.split("/").pop() || "download";
  triggerBrowserBlobDownload(blob, filename);
}
