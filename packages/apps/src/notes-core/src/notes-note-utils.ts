import { markdownToPlainText, noteBodyToMarkdown } from "@/lib/models/note-body-markdown";
import type { Note } from "@/lib/models/note";

export function persistBestEffort(promise: Promise<unknown>) {
  promise.catch(() => {});
}

/** Delay after the last edit before flushing a debounced API save (ms). */
export const AUTOSAVE_WRITE_DEBOUNCE_MS = 1200;

type PersistFn = (note: Note) => void;

/**
 * Per-note debounced save scheduler.
 *
 * Call `schedule(noteId, note, persist)` on each edit; the actual persist call
 * fires only after `delayMs` of inactivity for that note.
 * Call `flushAll(persist)` to immediately fire any pending saves (e.g. on unmount).
 */
export function createNoteSaveDebouncer(delayMs: number) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pending = new Map<string, Note>();

  function schedule(noteId: string, note: Note, persist: PersistFn): void {
    const existing = timers.get(noteId);
    if (existing) clearTimeout(existing);
    pending.set(noteId, note);
    const timer = setTimeout(() => {
      const p = pending.get(noteId);
      if (p) {
        persist(p);
        pending.delete(noteId);
      }
      timers.delete(noteId);
    }, delayMs);
    timers.set(noteId, timer);
  }

  function flushAll(persist: PersistFn): void {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    for (const note of pending.values()) {
      persist(note);
    }
    timers.clear();
    pending.clear();
  }

  return { schedule, flushAll };
}

export function plainTextFromBody(body: string[]): string {
  return markdownToPlainText(noteBodyToMarkdown(body));
}

export function computeWordCount(body: string[]): number {
  return plainTextFromBody(body).split(/\s+/).filter(Boolean).length;
}

export function computeExcerpt(body: string[]): string {
  const text = plainTextFromBody(body);
  if (text.length <= 180) return text;
  return `${text.slice(0, 179)}…`;
}

const NOTE_LIST_TITLE_MAX = 80;

/** Derives the list-row heading from excerpt or body (notes have no separate title field). */
export function noteListTitle(note: Pick<Note, "excerpt" | "body">): string {
  const excerpt = note.excerpt.trim();
  if (excerpt) {
    const withoutEllipsis = excerpt.endsWith("…") ? excerpt.slice(0, -1).trim() : excerpt;
    return withoutEllipsis.length <= NOTE_LIST_TITLE_MAX
      ? withoutEllipsis
      : `${withoutEllipsis.slice(0, NOTE_LIST_TITLE_MAX - 1)}…`;
  }
  const text = plainTextFromBody(note.body).trim();
  if (text) {
    return text.length <= NOTE_LIST_TITLE_MAX ? text : `${text.slice(0, NOTE_LIST_TITLE_MAX - 1)}…`;
  }
  return "Untitled note";
}

export function normalizeTag(value: string): string {
  return value.trim();
}

export function enrichNote(note: Note): Note {
  return {
    ...note,
    excerpt: computeExcerpt(note.body),
    wordCount: computeWordCount(note.body),
  };
}

export function filterVisibleNotes(
  notes: Note[],
  {
    view,
    archived,
    starred,
    searchQuery,
  }: {
    view: string;
    archived: Record<string, boolean>;
    starred: Record<string, boolean>;
    searchQuery: string;
  },
): Note[] {
  const q = searchQuery.trim().toLowerCase();
  return notes.filter((note) => {
    let inView = true;
    if (view === "all") inView = !archived[note.id];
    else if (view === "starred") inView = !!starred[note.id] && !archived[note.id];
    else if (view === "archive") inView = !!archived[note.id];
    else if (view.startsWith("nb:")) {
      const target = view.slice(3);
      inView =
        (note.notebook === target || note.notebook.toLowerCase() === target.toLowerCase()) &&
        !archived[note.id];
    } else if (view.startsWith("tag:")) {
      inView = note.tags.includes(view.slice(4)) && !archived[note.id];
    }
    if (!inView) return false;
    if (!q) return true;
    const haystack =
      `${note.excerpt} ${note.body.join(" ")} ${note.notebook} ${note.tags.join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}
