import type { NotesSeedData } from "@/lib/adapters/notes-adapter";
import { noteFromWgwItem } from "@/lib/api/wgw/notes";
import type { WgwNoteItem } from "@/lib/api/wgw/types";

const SAMPLE_ITEMS: WgwNoteItem[] = [
  {
    id: "wgw-note-1",
    notebook: "General",
    body: "Paragraph one from a WgwNoteItem.\n\nSecond block exercises splitBodyParagraphs the same way the REST body string would.",
    tags: ["openapi", "storybook"],
    starred: true,
    archived: false,
    updatedAt: "2025-10-12T14:30:00.000Z",
  },
  {
    id: "wgw-note-2",
    notebook: "Archive Demo",
    body: "This row has archived: true, which should open directly in the Archive sidebar bucket.",
    tags: ["archive"],
    starred: false,
    archived: true,
    updatedAt: "2025-09-01T09:00:00.000Z",
  },
];

export function notesSeedDataFromWgwSamples(): NotesSeedData {
  const notes = SAMPLE_ITEMS.map(noteFromWgwItem);
  const notebooks = [...new Set(SAMPLE_ITEMS.map((i) => i.notebook))];
  const tags = [...new Set(SAMPLE_ITEMS.flatMap((i) => i.tags ?? []))];
  return { notes, notebooks, tags };
}
