import { hasDocsCollabOfflinePersistence } from "@/lib/offline/docs/docs-collab-offline-availability";
import { noteCollabPath } from "@/notes-core/src/note-collab-path";
import { migrateCollabPersistence } from "@/text-editor-core/docs-collab/docs-collab-persistence";

type MigrateNoteCollabPersistenceArgs = {
  username: string;
  notebook: string;
  tempNoteId: string;
  savedNoteId: string;
  archived?: boolean;
};

/**
 * Move note-body collab persistence from a temporary offline id to the saved server id.
 * v0.9 scope is personal notes only.
 */
export async function migrateNoteCollabPersistenceAfterIdRemap({
  username,
  notebook,
  tempNoteId,
  savedNoteId,
  archived = false,
}: MigrateNoteCollabPersistenceArgs): Promise<void> {
  if (!username || !notebook || !tempNoteId || !savedNoteId) return;
  if (tempNoteId === savedNoteId) return;

  const oldPath = noteCollabPath({
    scope: { kind: "personal", username },
    notebook,
    noteId: tempNoteId,
    archived,
  });
  const newPath = noteCollabPath({
    scope: { kind: "personal", username },
    notebook,
    noteId: savedNoteId,
    archived,
  });

  if (oldPath === newPath) return;
  const hasOldPersistence = await hasDocsCollabOfflinePersistence(oldPath);
  if (!hasOldPersistence) return;
  await migrateCollabPersistence(oldPath, newPath);
}
