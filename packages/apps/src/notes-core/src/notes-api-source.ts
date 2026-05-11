import { createNotesAppBootstrap, type NotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
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
import type { DeleteNotebookAction, NotesAPIOperations } from "@/notes-core/src/notes-types";

export type NotesApiSource = {
  loadBootstrap: () => Promise<NotesAppBootstrap>;
  createOperations: () => NotesAPIOperations | undefined;
};

function notebookDeleteBodyForAction(action: DeleteNotebookAction): {
  mode: "archive" | "move" | "purge";
  target?: string;
} {
  if (action.kind === "archive") return { mode: "archive" };
  if (action.kind === "purge") return { mode: "purge" };
  return { mode: "move", target: action.target };
}

function createWgwOperations(): NotesAPIOperations {
  return {
    async upsertNote(note, opts) {
      const payload = wgwNoteUpsertFromNote(note, {
        starred: !!note.starred,
        archived: !!note.archived,
      });
      try {
        return await updateNoteItem(note.id, payload, opts);
      } catch (error) {
        const status = (error as { status?: number } | undefined)?.status;
        if (status !== 404) throw error;
        return createNoteItem(payload, opts);
      }
    },
    deleteNote(note, opts) {
      return deleteNoteItem(note.id, { notebook: note.notebook, archived: !!note.archived }, opts);
    },
    archiveNote(id, opts) {
      return archiveNoteItem(id, opts);
    },
    restoreNote(id, opts) {
      return restoreNoteItem(id, opts);
    },
    createNotebook(name, opts) {
      return createNotebookApi(name, opts);
    },
    renameNotebook(from, to, opts) {
      return renameNotebookApi(from, to, opts);
    },
    deleteNotebook(name, action, opts) {
      return deleteNotebookApi(name, notebookDeleteBodyForAction(action), opts);
    },
  };
}

export function createWgwNotesApiSource(): NotesApiSource {
  return {
    loadBootstrap: fetchNotesLiveBootstrap,
    createOperations: () => createWgwOperations(),
  };
}

export function createDefaultNotesApiSource(): NotesApiSource {
  return createWorkspaceSource<NotesApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createNotesAppBootstrap()),
      createOperations: () => undefined,
    }),
    createLiveSource: createWgwNotesApiSource,
  });
}
