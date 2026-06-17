import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { Note } from "@/lib/models/note";
import {
  enqueueCoalescedNoteUpdate,
  writeNotesBootstrapToCache,
} from "@/lib/offline/notes-offline-store";
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

const { updateNoteItem, createNoteItem, fetchNotesLiveBootstrap } = vi.hoisted(() => ({
  updateNoteItem: vi.fn(),
  createNoteItem: vi.fn(),
  fetchNotesLiveBootstrap: vi.fn(),
}));

vi.mock("@/lib/api/wgw/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/notes")>();
  return {
    ...actual,
    updateNoteItem,
    createNoteItem,
    fetchNotesLiveBootstrap,
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
    fetchNotesLiveBootstrap.mockReset();
    fetchNotesLiveBootstrap.mockResolvedValue(bootstrap);
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
});
