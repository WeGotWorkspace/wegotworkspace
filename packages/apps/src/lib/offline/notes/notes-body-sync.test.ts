import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/lib/models/note";
import { syncNotesBodiesForOffline } from "@/lib/offline/notes/notes-body-sync";
import { noteCollabPath } from "@/notes-core/src/note-collab-path";

const { hydrateDocsCollabForOffline } = vi.hoisted(() => ({
  hydrateDocsCollabForOffline: vi.fn(),
}));

vi.mock("@/lib/offline/docs/docs-pin-hydrate", () => ({
  hydrateDocsCollabForOffline,
}));

vi.mock("@/lib/offline/core/browser-online", () => ({
  getConnectivitySnapshot: vi.fn(() => true),
}));

describe("syncNotesBodiesForOffline", () => {
  beforeEach(() => {
    hydrateDocsCollabForOffline.mockReset();
    hydrateDocsCollabForOffline.mockResolvedValue(undefined);
  });

  it("hydrates personal note bodies via note collab paths", async () => {
    const notes: Note[] = [
      {
        id: "n-1",
        category: "Note",
        date: "2024-01-01T00:00:00.000Z",
        excerpt: "",
        body: ["One"],
        notebook: "Drafts",
        tags: [],
        wordCount: 1,
      },
      {
        id: "n-2",
        category: "Note",
        date: "2024-01-02T00:00:00.000Z",
        excerpt: "",
        body: ["Two"],
        notebook: "Archive",
        archived: true,
        tags: [],
        wordCount: 1,
      },
    ];

    const result = await syncNotesBodiesForOffline("alice", notes);

    expect(result.total).toBe(2);
    expect(result.synced).toBe(2);
    expect(hydrateDocsCollabForOffline).toHaveBeenCalledWith({
      apiPath: noteCollabPath({
        scope: { kind: "personal", username: "alice" },
        notebook: "Drafts",
        noteId: "n-1",
      }),
    });
    expect(hydrateDocsCollabForOffline).toHaveBeenCalledWith({
      apiPath: noteCollabPath({
        scope: { kind: "personal", username: "alice" },
        notebook: "Archive",
        noteId: "n-2",
        archived: true,
      }),
    });
  });
});
