import type { Note } from "@/lib/models/note";
import { getConnectivitySnapshot } from "@/lib/offline/core/browser-online";
import {
  isEligibleForAutoContentSync,
  readOfflineDeviceContentSettings,
} from "@/lib/offline/core/offline-device-settings";
import {
  emptyProgressiveSyncProgress,
  readProgressiveSyncProgress,
  runProgressiveSync,
  type ProgressiveSyncProgress,
} from "@/lib/offline/core/progressive-sync-runner";
import { noteCollabPath } from "@/notes-core/src/note-collab-path";
import { hydrateDocsCollabForOffline } from "@/lib/offline/docs/docs-pin-hydrate";

const NOTES_BODY_SYNC_META_KEY = "notes:auto-sync:body-progress";
const NOTES_BODY_SYNC_CONCURRENCY = 4;

export type NotesBodySyncProgress = ProgressiveSyncProgress;

function emptyProgress(): NotesBodySyncProgress {
  return emptyProgressiveSyncProgress();
}

export async function readNotesBodySyncProgress(username: string): Promise<NotesBodySyncProgress> {
  return readProgressiveSyncProgress(username, NOTES_BODY_SYNC_META_KEY);
}

/** Auto-hydrate note collab bodies for personal notes from the cached bootstrap list. */
export async function syncNotesBodiesForOffline(
  username: string,
  notes: readonly Note[],
): Promise<NotesBodySyncProgress> {
  if (!username || !getConnectivitySnapshot()) return emptyProgress();
  const settings = readOfflineDeviceContentSettings();
  if (!settings.contentSyncEnabled) return emptyProgress();

  const eligible = notes.filter((note) =>
    isEligibleForAutoContentSync(note.body?.length ?? 0, settings),
  );

  return runProgressiveSync({
    username,
    metaKey: NOTES_BODY_SYNC_META_KEY,
    items: eligible,
    concurrency: NOTES_BODY_SYNC_CONCURRENCY,
    syncOne: async (note) => {
      const apiPath = noteCollabPath({
        scope: { kind: "personal", username },
        notebook: note.notebook,
        noteId: note.id,
        archived: note.archived,
      });
      await hydrateDocsCollabForOffline({ apiPath });
    },
  });
}
