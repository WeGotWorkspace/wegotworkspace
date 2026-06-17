import type { Note } from "@/lib/models/note";
import type { DeleteNotebookAction, NotesAPIOperations } from "@/notes-core/src/notes-types";
import {
  archiveNoteItem,
  createNoteItem,
  createNotebook as createNotebookApi,
  deleteNotebook as deleteNotebookApi,
  deleteNoteItem,
  fetchNotesLiveBootstrap,
  renameNotebook as renameNotebookApi,
  restoreNoteItem,
  updateNoteItem,
  wgwNoteUpsertFromNote,
} from "@/lib/api/wgw/notes";
import { isFetchNetworkError, readBrowserOnline } from "@/lib/offline/core/browser-online";
import {
  createTempNoteId,
  enqueueCoalescedNoteUpdate,
  enqueueOutboxMutation,
  readNotesBootstrapFromCache,
  removeNoteFromCache,
  upsertNoteInCache,
  writeNotesBootstrapToCache,
} from "@/lib/offline/notes-offline-store";
import { NOTES_DOMAIN } from "@/lib/offline/notes/notes-schema";
import { flushNotesOutbox, type OutboxFlushResult } from "@/lib/offline/notes-outbox-flush";
import { reportNotesSyncConflicts } from "@/lib/offline/notes-sync-conflicts";
import { readOfflineNotesUsername } from "@/lib/offline/offline-session";
import {
  ConnectivitySyncRunner,
  ConnectivitySyncRunnerRegistry,
} from "@/lib/offline/core/connectivity-sync-runner";

function rethrowUnlessOfflineQueue(error: unknown, signal?: AbortSignal): void {
  if (signal?.aborted) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  if (!isFetchNetworkError(error)) throw error;
}

function notebookDeleteBodyForAction(action: DeleteNotebookAction): {
  mode: "archive" | "move" | "purge";
  target?: string;
} {
  if (action.kind === "archive") return { mode: "archive" };
  if (action.kind === "purge") return { mode: "purge" };
  return { mode: "move", target: action.target };
}

function baseUpdatedAt(note: Note): string | undefined {
  return note.date !== "—" ? note.date : undefined;
}

function applyNoteUpdate(existing: Note, patch: Note): Note {
  return { ...existing, ...patch };
}

const syncRunnerRegistry = new ConnectivitySyncRunnerRegistry<OutboxFlushResult>();

async function flushNotesOutboxAndReport(username: string): Promise<OutboxFlushResult> {
  const result = await flushNotesOutbox(username);
  reportNotesSyncConflicts(result.stateMismatches);
  return result;
}

function runnerFor(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return syncRunnerRegistry.getOrCreate(username, async () => flushNotesOutboxAndReport(username));
}

async function resolveCachedNote(
  username: string,
  noteId: string,
  _signal?: AbortSignal,
): Promise<Note | undefined> {
  const cached = await readNotesBootstrapFromCache(username);
  const fromCache = cached?.data.notes.find((n) => n.id === noteId);
  if (fromCache || !readBrowserOnline()) return fromCache;

  try {
    const bootstrap = await fetchNotesLiveBootstrap();
    return bootstrap.data.notes.find((n) => n.id === noteId);
  } catch (error) {
    if (isFetchNetworkError(error)) return fromCache;
    throw error;
  }
}

async function queueOfflineUpsert(
  username: string,
  note: Note,
  tempNoteId?: string,
): Promise<Note> {
  await upsertNoteInCache(username, note, true);
  await enqueueCoalescedNoteUpdate(username, note.id, note, baseUpdatedAt(note), tempNoteId);
  return note;
}

async function queueOfflineDelete(
  username: string,
  note: Pick<Note, "id" | "notebook" | "archived">,
): Promise<void> {
  await removeNoteFromCache(username, note.id);
  await enqueueOutboxMutation(username, {
    id: crypto.randomUUID(),
    domain: NOTES_DOMAIN,
    op: "delete",
    payload: JSON.stringify({
      noteId: note.id,
      notebook: note.notebook,
      archived: !!note.archived,
    }),
  });
}

async function upsertNoteOnline(
  username: string,
  note: Note,
  runner: ConnectivitySyncRunner<OutboxFlushResult>,
  opts?: { signal?: AbortSignal },
): Promise<Note> {
  const body = wgwNoteUpsertFromNote(note, {
    starred: !!note.starred,
    archived: !!note.archived,
  });
  try {
    const saved = await updateNoteItem(note.id, body, opts);
    await upsertNoteInCache(username, saved, false);
    await runner.flush();
    return saved;
  } catch (error) {
    const status = (error as { status?: number } | undefined)?.status;
    if (status !== 404) throw error;
    const saved = await createNoteItem(body, opts);
    await upsertNoteInCache(username, saved, false);
    await runner.flush();
    return saved;
  }
}

export function createHybridNotesOperations(username: string): NotesAPIOperations {
  const runner = runnerFor(username);

  return {
    upsertNote: async (note, opts) => {
      const existing = note.id
        ? await resolveCachedNote(username, note.id, opts?.signal)
        : undefined;
      const merged = existing ? applyNoteUpdate(existing, note) : note;
      if (!readBrowserOnline()) {
        const tempId = existing ? undefined : createTempNoteId();
        const optimistic = tempId ? { ...merged, id: tempId } : merged;
        return queueOfflineUpsert(username, optimistic, tempId);
      }
      try {
        return await upsertNoteOnline(username, merged, runner, opts);
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const tempId = existing ? undefined : createTempNoteId();
        const optimistic = tempId ? { ...merged, id: tempId } : merged;
        return queueOfflineUpsert(username, optimistic, tempId);
      }
    },
    deleteNote: async (note, opts) => {
      if (!readBrowserOnline()) {
        await queueOfflineDelete(username, note);
        return;
      }
      try {
        await deleteNoteItem(note.id, { notebook: note.notebook, archived: !!note.archived }, opts);
        await removeNoteFromCache(username, note.id);
        await runner.flush();
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        await queueOfflineDelete(username, note);
      }
    },
    archiveNote: async (id, opts) => {
      const existing = await resolveCachedNote(username, id, opts?.signal);
      if (!existing) {
        throw new Error(
          !readBrowserOnline() ? "Note not found in cache while offline" : "Note not found",
        );
      }
      if (!readBrowserOnline()) {
        const optimistic = { ...existing, archived: true };
        await upsertNoteInCache(username, optimistic, true);
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "archive",
          payload: JSON.stringify({ noteId: id }),
        });
        return optimistic;
      }
      try {
        const saved = await archiveNoteItem(id, opts);
        await upsertNoteInCache(username, saved, false);
        await runner.flush();
        return saved;
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const optimistic = { ...existing, archived: true };
        await upsertNoteInCache(username, optimistic, true);
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "archive",
          payload: JSON.stringify({ noteId: id }),
        });
        return optimistic;
      }
    },
    restoreNote: async (id, opts) => {
      const existing = await resolveCachedNote(username, id, opts?.signal);
      if (!existing) {
        throw new Error(
          !readBrowserOnline() ? "Note not found in cache while offline" : "Note not found",
        );
      }
      if (!readBrowserOnline()) {
        const optimistic = { ...existing, archived: false };
        await upsertNoteInCache(username, optimistic, true);
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "restore",
          payload: JSON.stringify({ noteId: id }),
        });
        return optimistic;
      }
      try {
        const saved = await restoreNoteItem(id, opts);
        await upsertNoteInCache(username, saved, false);
        await runner.flush();
        return saved;
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const optimistic = { ...existing, archived: false };
        await upsertNoteInCache(username, optimistic, true);
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "restore",
          payload: JSON.stringify({ noteId: id }),
        });
        return optimistic;
      }
    },
    createNotebook: async (name, opts) => {
      if (!readBrowserOnline()) {
        const cached = await readNotesBootstrapFromCache(username);
        if (cached && !cached.data.notebooks.includes(name)) {
          cached.data.notebooks.push(name);
          await writeNotesBootstrapToCache(username, cached);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "createNotebook",
          payload: JSON.stringify({ name }),
        });
        return;
      }
      try {
        await createNotebookApi(name, opts);
        await runner.flush();
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const cached = await readNotesBootstrapFromCache(username);
        if (cached && !cached.data.notebooks.includes(name)) {
          cached.data.notebooks.push(name);
          await writeNotesBootstrapToCache(username, cached);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "createNotebook",
          payload: JSON.stringify({ name }),
        });
      }
    },
    renameNotebook: async (from, to, opts) => {
      if (!readBrowserOnline()) {
        const cached = await readNotesBootstrapFromCache(username);
        if (cached) {
          cached.data.notebooks = cached.data.notebooks.map((n) => (n === from ? to : n));
          cached.data.notes = cached.data.notes.map((n) =>
            n.notebook === from ? { ...n, notebook: to } : n,
          );
          await writeNotesBootstrapToCache(username, cached);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "renameNotebook",
          payload: JSON.stringify({ from, to }),
        });
        return;
      }
      try {
        await renameNotebookApi(from, to, opts);
        await runner.flush();
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const cached = await readNotesBootstrapFromCache(username);
        if (cached) {
          cached.data.notebooks = cached.data.notebooks.map((n) => (n === from ? to : n));
          cached.data.notes = cached.data.notes.map((n) =>
            n.notebook === from ? { ...n, notebook: to } : n,
          );
          await writeNotesBootstrapToCache(username, cached);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "renameNotebook",
          payload: JSON.stringify({ from, to }),
        });
      }
    },
    deleteNotebook: async (name, action, opts) => {
      if (!readBrowserOnline()) {
        const cached = await readNotesBootstrapFromCache(username);
        if (cached) {
          cached.data.notebooks = cached.data.notebooks.filter((n) => n !== name);
          await writeNotesBootstrapToCache(username, cached);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "deleteNotebook",
          payload: JSON.stringify({ name, action }),
        });
        return;
      }
      try {
        await deleteNotebookApi(name, notebookDeleteBodyForAction(action), opts);
        await runner.flush();
      } catch (error) {
        rethrowUnlessOfflineQueue(error, opts?.signal);
        const cached = await readNotesBootstrapFromCache(username);
        if (cached) {
          cached.data.notebooks = cached.data.notebooks.filter((n) => n !== name);
          await writeNotesBootstrapToCache(username, cached);
        }
        await enqueueOutboxMutation(username, {
          id: crypto.randomUUID(),
          domain: NOTES_DOMAIN,
          op: "deleteNotebook",
          payload: JSON.stringify({ name, action }),
        });
      }
    },
  };
}

export async function fetchNotesHybridBootstrap(): Promise<
  Awaited<ReturnType<typeof fetchNotesLiveBootstrap>>
> {
  const bootstrap = await fetchNotesLiveBootstrap();
  const username = bootstrap.session.user.username;
  if (!username) {
    throw new Error("Notes bootstrap missing username");
  }
  if (readBrowserOnline()) {
    await flushNotesOutboxAndReport(username);
  }
  await writeNotesBootstrapToCache(username, bootstrap);
  return bootstrap;
}

export async function loadNotesBootstrapHybrid(): Promise<
  Awaited<ReturnType<typeof fetchNotesLiveBootstrap>>
> {
  if (!readBrowserOnline()) {
    const username = readOfflineNotesUsername();
    if (username) {
      const cached = await readNotesBootstrapFromCache(username);
      if (cached) return cached;
    }
    throw new Error("No cached notes available offline");
  }

  return fetchNotesHybridBootstrap();
}

export function getNotesSyncRunner(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return runnerFor(username);
}
