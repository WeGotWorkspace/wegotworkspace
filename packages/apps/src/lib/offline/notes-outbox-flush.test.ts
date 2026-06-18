import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { Note } from "@/lib/models/note";
import {
  enqueueCoalescedNoteUpdate,
  enqueueOutboxMutation,
  upsertNoteInCache,
  writeNotesBootstrapToCache,
} from "@/lib/offline/notes-offline-store";
import { NOTES_DOMAIN } from "@/lib/offline/notes/notes-schema";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/offline-db";
import { notesNotesTable } from "@/lib/offline/notes/notes-schema";
import { flushNotesOutbox } from "@/lib/offline/notes-outbox-flush";

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
};

const { updateNoteItem, createNoteItem, deleteNoteItem } = vi.hoisted(() => ({
  updateNoteItem: vi.fn(),
  createNoteItem: vi.fn(),
  deleteNoteItem: vi.fn(),
}));

vi.mock("@/lib/api/wgw/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/notes")>();
  return {
    ...actual,
    updateNoteItem,
    createNoteItem,
    deleteNoteItem,
    parseNotesItemsPayload: actual.parseNotesItemsPayload,
  };
});

vi.mock("@/lib/api/wgw/http", () => ({
  wgwFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      items: [{ id: "note-1", notebook: "Drafts", updatedAt: "2024-10-11T10:00:00.000Z" }],
    }),
  }),
  wgwReadJson: vi.fn(async (res: { json: () => Promise<unknown> }) => res.json()),
}));

vi.mock("@/lib/offline/core/browser-online", () => ({
  readBrowserOnline: vi.fn(() => true),
}));

describe("flushNotesOutbox", () => {
  beforeEach(async () => {
    updateNoteItem.mockReset();
    createNoteItem.mockReset();
    deleteNoteItem.mockReset();
    const { wgwFetch } = await import("@/lib/api/wgw/http");
    vi.mocked(wgwFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "note-1", notebook: "Drafts", updatedAt: "2024-10-12T10:00:00.000Z" }],
      }),
    } as never);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await writeNotesBootstrapToCache(username, bootstrap);
  });

  it("flushes a coalesced offline upsert once", async () => {
    await enqueueCoalescedNoteUpdate(username, note.id, note, note.date);
    await enqueueCoalescedNoteUpdate(
      username,
      note.id,
      { ...note, title: "Updated title" },
      note.date,
    );

    updateNoteItem.mockResolvedValue({ ...note, title: "Updated title" });

    const result = await flushNotesOutbox(username);
    expect(updateNoteItem).toHaveBeenCalledOnce();
    expect(result.stateMismatches).toEqual([]);
  });

  it("reports a conflict when server updatedAt is newer than the cached base", async () => {
    await enqueueCoalescedNoteUpdate(
      username,
      note.id,
      { ...note, title: "Local edit" },
      note.date,
    );

    const { wgwFetch } = await import("@/lib/api/wgw/http");
    vi.mocked(wgwFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "note-1", notebook: "Drafts", updatedAt: "2024-10-13T10:00:00.000Z" }],
      }),
    } as never);

    const result = await flushNotesOutbox(username);
    expect(result.stateMismatches).toEqual(["note-1"]);
    expect(updateNoteItem).not.toHaveBeenCalled();
  });

  it("creates a server note and drops the local temp id from cache", async () => {
    const tempId = "local-offline-create";
    const offlineNote: Note = {
      ...note,
      id: tempId,
      title: "Created offline",
    };

    await enqueueCoalescedNoteUpdate(username, tempId, offlineNote, offlineNote.date, tempId);

    updateNoteItem.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    const saved = { ...note, id: "server-note-99", title: "Created offline" };
    createNoteItem.mockResolvedValue(saved);

    const result = await flushNotesOutbox(username);

    expect(updateNoteItem).toHaveBeenCalledOnce();
    expect(createNoteItem).toHaveBeenCalledOnce();
    expect(result.bootstrap?.data.notes.some((row) => row.id === "server-note-99")).toBe(true);
    expect(result.bootstrap?.data.notes.some((row) => row.id === tempId)).toBe(false);
  });

  it("clears pendingSync after a successful flush", async () => {
    await upsertNoteInCache(username, { ...note, title: "Synced title" }, true);
    await enqueueCoalescedNoteUpdate(
      username,
      note.id,
      { ...note, title: "Synced title" },
      note.date,
    );
    updateNoteItem.mockResolvedValue({ ...note, title: "Synced title" });

    await flushNotesOutbox(username);

    expect(updateNoteItem).toHaveBeenCalledOnce();
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    const row = await notesNotesTable(db).get("note-1");
    expect(row?.pendingSync).toBe(false);
    expect(JSON.parse(row?.data ?? "{}").title).toBe("Synced title");
  });

  it("flushes a queued delete and removes the note from cache", async () => {
    await enqueueOutboxMutation(username, {
      id: "delete-row-1",
      domain: NOTES_DOMAIN,
      op: "delete",
      payload: JSON.stringify({
        noteId: note.id,
        notebook: note.notebook,
        archived: false,
      }),
    });
    deleteNoteItem.mockResolvedValue(undefined);

    const result = await flushNotesOutbox(username);

    expect(deleteNoteItem).toHaveBeenCalledWith(note.id, {
      notebook: note.notebook,
      archived: false,
    });
    expect(result.bootstrap?.data.notes.some((row) => row.id === note.id)).toBe(false);
  });
});
