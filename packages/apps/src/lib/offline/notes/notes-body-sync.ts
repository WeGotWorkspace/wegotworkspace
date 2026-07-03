import type { Note } from "@/lib/models/note";
import { getConnectivitySnapshot } from "@/lib/offline/core/browser-online";
import { readMeta, writeMeta } from "@/lib/offline/core/meta-store";
import { noteCollabPath } from "@/notes-core/src/note-collab-path";
import { hydrateDocsCollabForOffline } from "@/lib/offline/docs/docs-pin-hydrate";

const NOTES_BODY_SYNC_META_KEY = "notes:auto-sync:body-progress";

export type NotesBodySyncProgress = {
  running: boolean;
  total: number;
  synced: number;
  failed: number;
  updatedAt: number;
};

function emptyProgress(): NotesBodySyncProgress {
  return {
    running: false,
    total: 0,
    synced: 0,
    failed: 0,
    updatedAt: Date.now(),
  };
}

async function writeProgress(username: string, progress: NotesBodySyncProgress): Promise<void> {
  await writeMeta(username, NOTES_BODY_SYNC_META_KEY, JSON.stringify(progress));
}

export async function readNotesBodySyncProgress(username: string): Promise<NotesBodySyncProgress> {
  const raw = await readMeta(username, NOTES_BODY_SYNC_META_KEY);
  if (!raw) return emptyProgress();
  try {
    return {
      ...emptyProgress(),
      ...(JSON.parse(raw) as Partial<NotesBodySyncProgress>),
      updatedAt: Date.now(),
    };
  } catch {
    return emptyProgress();
  }
}

/** Auto-hydrate note collab bodies for personal notes from the cached bootstrap list. */
export async function syncNotesBodiesForOffline(
  username: string,
  notes: readonly Note[],
): Promise<NotesBodySyncProgress> {
  if (!username || !getConnectivitySnapshot()) return emptyProgress();
  const progress: NotesBodySyncProgress = {
    running: true,
    total: notes.length,
    synced: 0,
    failed: 0,
    updatedAt: Date.now(),
  };
  await writeProgress(username, progress);

  for (const note of notes) {
    const apiPath = noteCollabPath({
      scope: { kind: "personal", username },
      notebook: note.notebook,
      noteId: note.id,
      archived: note.archived,
    });
    try {
      await hydrateDocsCollabForOffline({ apiPath });
      progress.synced += 1;
    } catch {
      progress.failed += 1;
    }
    progress.updatedAt = Date.now();
    await writeProgress(username, progress);
  }

  progress.running = false;
  progress.updatedAt = Date.now();
  await writeProgress(username, progress);
  return progress;
}
