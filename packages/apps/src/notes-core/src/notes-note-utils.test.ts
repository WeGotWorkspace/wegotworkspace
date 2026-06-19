import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_WRITE_DEBOUNCE_MS,
  computeExcerpt,
  computeWordCount,
  createNoteSaveDebouncer,
  enrichNote,
  filterVisibleNotes,
  normalizeTag,
  noteListTitle,
  plainTextFromBody,
} from "./notes-note-utils";
import type { Note } from "@/lib/models/note";

const sampleNote: Note = {
  id: "n-1",
  category: "Note",
  date: "2026-01-01T00:00:00.000Z",
  excerpt: "Hello excerpt",
  body: ["# Title", "Some **bold** text here."],
  notebook: "Drafts",
  tags: ["work"],
  wordCount: 0,
};

describe("notes-note-utils", () => {
  it("normalizes tags by trimming whitespace", () => {
    expect(normalizeTag("  focus  ")).toBe("focus");
  });

  it("computes plain text and word count from markdown body", () => {
    expect(plainTextFromBody(sampleNote.body)).toContain("Title");
    expect(computeWordCount(sampleNote.body)).toBeGreaterThan(0);
  });

  it("truncates long excerpts", () => {
    const longBody = ["x".repeat(200)];
    expect(computeExcerpt(longBody).endsWith("…")).toBe(true);
  });

  it("derives list titles from excerpt or body", () => {
    expect(noteListTitle({ excerpt: "Preview line", body: [""] })).toBe("Preview line");
    expect(noteListTitle({ excerpt: "", body: ["Body line one"] })).toBe("Body line one");
    expect(noteListTitle({ excerpt: "", body: [""] })).toBe("Untitled note");
  });

  it("enriches notes with excerpt and word count", () => {
    const enriched = enrichNote({ ...sampleNote, excerpt: "", wordCount: 0 });
    expect(enriched.excerpt.length).toBeGreaterThan(0);
    expect(enriched.wordCount).toBeGreaterThan(0);
  });

  it("AUTOSAVE_WRITE_DEBOUNCE_MS is at least 500ms and at most 3000ms", () => {
    expect(AUTOSAVE_WRITE_DEBOUNCE_MS).toBeGreaterThanOrEqual(500);
    expect(AUTOSAVE_WRITE_DEBOUNCE_MS).toBeLessThanOrEqual(3000);
  });

  it("filters notes by view and search query", () => {
    const notes: Note[] = [
      { ...sampleNote, id: "n-1", starred: true, archived: false },
      {
        ...sampleNote,
        id: "n-2",
        excerpt: "Other excerpt",
        body: ["Other body"],
        starred: false,
        archived: true,
      },
    ];
    const starredOnly = filterVisibleNotes(notes, {
      view: "starred",
      archived: { "n-2": true },
      starred: { "n-1": true },
      searchQuery: "",
    });
    expect(starredOnly.map((note) => note.id)).toEqual(["n-1"]);

    const searchMatch = filterVisibleNotes(notes, {
      view: "all",
      archived: { "n-2": true },
      starred: { "n-1": true },
      searchQuery: "other",
    });
    expect(searchMatch).toHaveLength(0);
  });
});

describe("createNoteSaveDebouncer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not persist immediately when schedule is called", () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const { schedule } = createNoteSaveDebouncer(500);
    schedule("n-1", sampleNote, persist);
    expect(persist).not.toHaveBeenCalled();
  });

  it("persists the note after the debounce delay", () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const { schedule } = createNoteSaveDebouncer(500);
    schedule("n-1", sampleNote, persist);
    vi.advanceTimersByTime(500);
    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith(sampleNote);
  });

  it("resets the timer when schedule is called again before delay elapses", () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const { schedule } = createNoteSaveDebouncer(500);
    const updatedNote = { ...sampleNote, body: ["Updated body"] };
    schedule("n-1", sampleNote, persist);
    vi.advanceTimersByTime(300);
    schedule("n-1", updatedNote, persist);
    vi.advanceTimersByTime(300);
    expect(persist).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith(updatedNote);
  });

  it("persists the latest note value when rapid edits arrive", () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const { schedule } = createNoteSaveDebouncer(500);
    const v1 = { ...sampleNote, body: ["v1"] };
    const v2 = { ...sampleNote, body: ["v2"] };
    const v3 = { ...sampleNote, body: ["v3"] };
    schedule("n-1", v1, persist);
    schedule("n-1", v2, persist);
    schedule("n-1", v3, persist);
    vi.advanceTimersByTime(500);
    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith(v3);
  });

  it("tracks different notes independently", () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const { schedule } = createNoteSaveDebouncer(500);
    const note2 = { ...sampleNote, id: "n-2", body: ["Note 2 body"] };
    schedule("n-1", sampleNote, persist);
    schedule("n-2", note2, persist);
    vi.advanceTimersByTime(500);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("flushAll immediately persists all pending notes and cancels timers", () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const { schedule, flushAll } = createNoteSaveDebouncer(500);
    const note2 = { ...sampleNote, id: "n-2", body: ["Note 2 body"] };
    schedule("n-1", sampleNote, persist);
    schedule("n-2", note2, persist);
    flushAll(persist);
    expect(persist).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(500);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("flushAll does nothing when there are no pending saves", () => {
    const persist = vi.fn();
    const { flushAll } = createNoteSaveDebouncer(500);
    flushAll(persist);
    expect(persist).not.toHaveBeenCalled();
  });
});
