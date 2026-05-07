import type { Note } from "@/lib/models/note";

export type NotesUIData = {
  notes: Note[];
  notebooks: string[];
  tags: string[];
};

export type DeleteNotebookAction =
  | { kind: "move"; target: string }
  | { kind: "archive" }
  | { kind: "purge" };

/**
 * Backend-agnostic notes operations consumed by notes UI/controller.
 * Implement this for any provider (WGW, custom API, local-only, etc).
 */
export type NotesAPIOperations = {
  upsertNote: (note: Note, opts?: { signal?: AbortSignal }) => Promise<Note>;
  deleteNote: (
    note: Pick<Note, "id" | "notebook" | "archived">,
    opts?: { signal?: AbortSignal },
  ) => Promise<void>;
  archiveNote: (id: string, opts?: { signal?: AbortSignal }) => Promise<Note>;
  restoreNote: (id: string, opts?: { signal?: AbortSignal }) => Promise<Note>;
  createNotebook: (name: string, opts?: { signal?: AbortSignal }) => Promise<void>;
  renameNotebook: (from: string, to: string, opts?: { signal?: AbortSignal }) => Promise<void>;
  deleteNotebook: (
    name: string,
    action: DeleteNotebookAction,
    opts?: { signal?: AbortSignal },
  ) => Promise<void>;
};
