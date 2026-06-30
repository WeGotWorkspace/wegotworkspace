import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { docsCollabRoomKey } from "@/text-editor-core/docs-collab/docs-collab-persistence";
import { isYDocEmpty } from "@/text-editor-core/docs-collab/docs-collab-utils";

async function roomHasCollabPersistence(roomKey: string): Promise<boolean> {
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(roomKey, ydoc);
  try {
    await persistence.whenSynced;
    return !isYDocEmpty(ydoc);
  } catch {
    return false;
  } finally {
    await persistence.destroy();
    ydoc.destroy();
  }
}

/** Whether a collab room has local Yjs state restorable without network. */
export async function hasDocsCollabOfflinePersistence(
  apiPath: string | null | undefined,
): Promise<boolean> {
  const room = docsCollabRoomKey(apiPath ?? "");
  if (!room || !isDocsCollabEditablePath(room)) return false;

  if (await roomHasCollabPersistence(room)) return true;

  // Legacy room keys written before collab room normalization (leading slash).
  const legacy = apiPath?.trim().startsWith("/") ? room : `/${room}`;
  if (legacy !== room) {
    return roomHasCollabPersistence(legacy);
  }
  return false;
}
