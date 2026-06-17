import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { Note } from "@/lib/models/note";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/offline-db";
import { NOTES_DOMAIN } from "@/lib/offline/notes/notes-schema";
import {
  enqueueCoalescedNoteUpdate,
  enqueueOutboxMutation,
  listOutboxMutations,
  readNotesBootstrapFromCache,
  upsertNoteInCache,
  writeNotesBootstrapToCache,
} from "@/lib/offline/notes-offline-store";

const username = "bob";

const note: Note = {
  id: "note-1",
  category: "Note",
  date: "2024-10-12T10:00:00.000Z",
  title: "Quiet draft",
  excerpt: "Draft excerpt",
  body: ["Body text"],
  notebook: "Drafts",
  tags: ["essay"],
  wordCount: 2,
};

const bootstrap = {
  session: mockWorkspaceSession,
  data: {
    notes: [note],
    notebooks: ["Drafts"],
    tags: ["essay"],
  },
} satisfies ReturnType<typeof createNotesAppBootstrap>;

describe("notes offline store", () => {
  beforeEach(async () => {
    await writeNotesBootstrapToCache(username, bootstrap);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
  });

  it("reads bootstrap written to cache", async () => {
    const cached = await readNotesBootstrapFromCache(username);
    expect(cached?.data.notes[0]?.title).toBe("Quiet draft");
  });

  it("preserves pendingSync notes when bootstrap is rewritten from server", async () => {
    const localNote = { ...note, title: "Local title" };
    await upsertNoteInCache(username, localNote, true);

    await writeNotesBootstrapToCache(username, {
      ...bootstrap,
      data: {
        ...bootstrap.data,
        notes: [{ ...note, title: "Server title" }],
      },
    });

    const cached = await readNotesBootstrapFromCache(username);
    expect(cached?.data.notes[0]?.title).toBe("Local title");
  });

  it("coalesces pending upsert rows for the same note", async () => {
    await enqueueCoalescedNoteUpdate(username, note.id, note, note.date);
    await enqueueCoalescedNoteUpdate(
      username,
      note.id,
      { ...note, title: "Merged title" },
      note.date,
    );

    const rows = await listOutboxMutations(username);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.op).toBe("upsert");
    expect(JSON.parse(rows[0]?.payload ?? "{}").note.title).toBe("Merged title");
  });

  it("orders outbox mutations by createdAt", async () => {
    await enqueueOutboxMutation(username, {
      id: "b",
      domain: NOTES_DOMAIN,
      op: "delete",
      payload: "{}",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await enqueueOutboxMutation(username, {
      id: "a",
      domain: NOTES_DOMAIN,
      op: "delete",
      payload: "{}",
    });
    const rows = await listOutboxMutations(username);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });
});
