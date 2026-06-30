import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { PENDING_SERVER_SAVE_KEY } from "@/text-editor-core/docs-collab/use-docs-collab-save";

/** Stable y-indexeddb room key for a drive virtual path (no leading slash). */
export function docsCollabRoomKey(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

async function persistenceHasPendingSave(roomKey: string): Promise<boolean> {
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(roomKey, ydoc);
  try {
    await persistence.whenSynced;
    const pending = await persistence.get(PENDING_SERVER_SAVE_KEY);
    return Boolean(pending);
  } catch {
    return false;
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
}

/** Whether a collab room has a deferred server save recorded in y-indexeddb. */
export async function hasDocsCollabPendingServerSave(
  apiPath: string | null | undefined,
): Promise<boolean> {
  const room = docsCollabRoomKey(apiPath ?? "");
  if (!room || !isDocsCollabEditablePath(room)) return false;

  if (await persistenceHasPendingSave(room)) return true;

  const legacy = apiPath?.trim().startsWith("/") ? room : `/${room}`;
  if (legacy !== room) {
    return persistenceHasPendingSave(legacy);
  }
  return false;
}

/** Clears y-indexeddb persistence for a collab room (e.g. remove offline copy). */
export async function clearDocsCollabOfflinePersistence(apiPath: string): Promise<void> {
  const room = docsCollabRoomKey(apiPath);
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(room, ydoc);
  try {
    await persistence.whenSynced;
    await persistence.clearData();
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
}

/**
 * Renames y-indexeddb persistence when a collab document path changes.
 * Copies Yjs state + pending-server-save meta and clears the old room key.
 */
export async function migrateCollabPersistence(oldPath: string, newPath: string): Promise<void> {
  if (oldPath === newPath) {
    throw new Error("migrateCollabPersistence requires distinct old and new paths");
  }

  const oldRoom = docsCollabRoomKey(oldPath);
  const newRoom = docsCollabRoomKey(newPath);
  const oldDoc = new Y.Doc();
  const newDoc = new Y.Doc();
  const oldPersistence = new IndexeddbPersistence(oldRoom, oldDoc);
  const newPersistence = new IndexeddbPersistence(newRoom, newDoc);
  try {
    await Promise.all([oldPersistence.whenSynced, newPersistence.whenSynced]);
    const oldUpdate = Y.encodeStateAsUpdate(oldDoc);
    if (oldUpdate.length > 0) {
      Y.applyUpdate(newDoc, oldUpdate);
    }

    const pendingServerSave = await oldPersistence.get("pendingServerSave");
    if (pendingServerSave) {
      await newPersistence.set("pendingServerSave", 1);
    }
    await oldPersistence.clearData();
  } finally {
    await oldPersistence.destroy();
    await newPersistence.destroy();
    oldDoc.destroy();
    newDoc.destroy();
  }
}
