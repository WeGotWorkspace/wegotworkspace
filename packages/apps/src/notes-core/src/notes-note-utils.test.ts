import { describe, expect, it } from "vitest";
import {
  computeExcerpt,
  computeWordCount,
  enrichNote,
  filterVisibleNotes,
  normalizeTag,
  plainTextFromBody,
} from "./notes-note-utils";
import type { Note } from "@/lib/models/note";

const sampleNote: Note = {
  id: "n-1",
  category: "Note",
  date: "2026-01-01T00:00:00.000Z",
  title: "Hello",
  excerpt: "",
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

  it("enriches notes with excerpt and word count", () => {
    const enriched = enrichNote({ ...sampleNote, excerpt: "", wordCount: 0 });
    expect(enriched.excerpt.length).toBeGreaterThan(0);
    expect(enriched.wordCount).toBeGreaterThan(0);
  });

  it("filters notes by view and search query", () => {
    const notes: Note[] = [
      { ...sampleNote, id: "n-1", starred: true, archived: false },
      { ...sampleNote, id: "n-2", title: "Other", starred: false, archived: true },
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
