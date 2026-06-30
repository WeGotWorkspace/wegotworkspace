import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { isYDocEmpty } from "@/text-editor-core/docs-collab/docs-collab-utils";

/** Whether a collab room has local Yjs state restorable without network. */
export async function hasDocsCollabOfflinePersistence(
  apiPath: string | null | undefined,
): Promise<boolean> {
  const room = apiPath?.trim();
  if (!room || !isDocsCollabEditablePath(room)) return false;

  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(room, ydoc);
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
