import { markdownToPlainText, noteBodyToMarkdown } from "@/lib/models/note-body-markdown";
import type { Note } from "@/lib/models/note";

export function persistBestEffort(promise: Promise<unknown>) {
  promise.catch(() => {});
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
      `${note.title} ${note.excerpt} ${note.body.join(" ")} ${note.notebook} ${note.tags.join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}
