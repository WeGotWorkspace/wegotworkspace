import type { Note } from "@/lib/models/note";

export type NotesSeedData = {
  notes: Note[];
  notebooks: string[];
  tags: string[];
};

export type NotesAdapter = {
  getSeedData: () => NotesSeedData;
};
