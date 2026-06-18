import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

/**
 * Renames y-indexeddb persistence when a collab document path changes.
 * Copies Yjs state + pending-server-save meta and clears the old room key.
 */
export async function migrateCollabPersistence(oldPath: string, newPath: string): Promise<void> {
  if (oldPath === newPath) {
    throw new Error("migrateCollabPersistence requires distinct old and new paths");
  }

  const oldDoc = new Y.Doc();
  const newDoc = new Y.Doc();
  const oldPersistence = new IndexeddbPersistence(oldPath, oldDoc);
  const newPersistence = new IndexeddbPersistence(newPath, newDoc);
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
