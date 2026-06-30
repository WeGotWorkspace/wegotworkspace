import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { PENDING_SERVER_SAVE_KEY } from "@/text-editor-core/docs-collab/use-docs-collab-save";

/** Stable y-indexeddb room key for a drive virtual path (no leading slash). */
export function docsCollabRoomKey(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

async function withCollabPersistence<T>(
  roomKey: string,
  run: (persistence: IndexeddbPersistence) => Promise<T>,
): Promise<T | undefined> {
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(roomKey, ydoc);
  try {
    await persistence.whenSynced;
    return await run(persistence);
  } catch {
    return undefined;
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
}

async function persistenceHasPendingSave(roomKey: string): Promise<boolean> {
  const pending = await withCollabPersistence(roomKey, (persistence) =>
    persistence.get(PENDING_SERVER_SAVE_KEY),
  );
  return Boolean(pending);
}

async function clearPendingSaveInRoom(roomKey: string): Promise<void> {
  await withCollabPersistence(roomKey, async (persistence) => {
    await persistence.del(PENDING_SERVER_SAVE_KEY);
  });
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

/** Clears deferred server-save metadata for a collab room in y-indexeddb. */
export async function clearDocsCollabPendingServerSave(
  apiPath: string | null | undefined,
): Promise<void> {
  const room = docsCollabRoomKey(apiPath ?? "");
  if (!room || !isDocsCollabEditablePath(room)) return;

  await clearPendingSaveInRoom(room);

  const legacy = apiPath?.trim().startsWith("/") ? room : `/${room}`;
  if (legacy !== room) {
    await clearPendingSaveInRoom(legacy);
  }
}

export type DocsCollabOfflinePersistenceSnapshot = {
  yjsUpdate: Uint8Array;
  pendingServerSave: boolean;
};

async function captureRoomPersistence(
  roomKey: string,
): Promise<DocsCollabOfflinePersistenceSnapshot | undefined> {
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(roomKey, ydoc);
  try {
    await persistence.whenSynced;
    const yjsUpdate = Y.encodeStateAsUpdate(ydoc);
    if (yjsUpdate.length === 0) return undefined;
    const pendingServerSave = Boolean(await persistence.get(PENDING_SERVER_SAVE_KEY));
    return { yjsUpdate, pendingServerSave };
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
}

/** Captures y-indexeddb collab state before offline trash side effects clear it. */
export async function captureDocsCollabOfflinePersistence(
  apiPath: string,
): Promise<DocsCollabOfflinePersistenceSnapshot | undefined> {
  const room = docsCollabRoomKey(apiPath);
  if (!room || !isDocsCollabEditablePath(room)) return undefined;

  const snapshot = await captureRoomPersistence(room);
  if (snapshot) return snapshot;

  const legacy = apiPath.trim().startsWith("/") ? room : `/${room}`;
  if (legacy !== room) {
    return captureRoomPersistence(legacy);
  }
  return undefined;
}

/** Restores y-indexeddb collab state captured before offline trash. */
export async function restoreDocsCollabOfflinePersistence(
  apiPath: string,
  snapshot: DocsCollabOfflinePersistenceSnapshot,
): Promise<void> {
  const room = docsCollabRoomKey(apiPath);
  if (!room || !isDocsCollabEditablePath(room)) return;

  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(room, ydoc);
  try {
    await persistence.whenSynced;
    if (snapshot.yjsUpdate.length > 0) {
      Y.applyUpdate(ydoc, snapshot.yjsUpdate);
    }
    if (snapshot.pendingServerSave) {
      await persistence.set(PENDING_SERVER_SAVE_KEY, 1);
    } else {
      await persistence.del(PENDING_SERVER_SAVE_KEY);
    }
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
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
