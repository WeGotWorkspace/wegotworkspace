import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/lib/models/note";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  listOutboxMutations,
  readNotesBootstrapFromCache,
  writeNotesBootstrapToCache,
} from "@/lib/offline/notes-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/offline-db";
import { notesNotesTable, notesNotebooksTable } from "@/lib/offline/notes/notes-schema";
import { createHybridNotesOperations } from "@/lib/offline/notes-hybrid-operations";

const username = "alice";

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
  session: { ...mockWorkspaceSession, user: { ...mockWorkspaceSession.user, username } },
  data: {
    notes: [note],
    notebooks: ["Drafts"],
    tags: ["essay"],
  },
};

vi.mock("@/lib/api/wgw/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/notes")>();
  return {
    ...actual,
    updateNoteItem: vi.fn(),
    createNoteItem: vi.fn(),
    deleteNoteItem: vi.fn(),
    archiveNoteItem: vi.fn(),
    restoreNoteItem: vi.fn(),
    createNotebook: vi.fn(),
    renameNotebook: vi.fn(),
    deleteNotebook: vi.fn(),
    fetchNotesLiveBootstrap: vi.fn(),
  };
});

vi.mock("@/lib/offline/core/browser-online", () => ({
  readBrowserOnline: vi.fn(() => true),
  isFetchNetworkError: vi.fn((error: unknown) => {
    if (error instanceof TypeError) {
      return error.message.toLowerCase().includes("network");
    }
    return false;
  }),
  subscribeBrowserOnline: vi.fn(() => () => undefined),
}));

import { updateNoteItem } from "@/lib/api/wgw/notes";
import { readBrowserOnline } from "@/lib/offline/core/browser-online";

describe("createHybridNotesOperations", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await notesNotesTable(db).clear();
    await notesNotebooksTable(db).clear();
    await db.meta.clear();
    await writeNotesBootstrapToCache(username, bootstrap);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues upsert offline and updates IndexedDB when navigator.onLine is false", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridNotesOperations(username);
    const saved = await operations.upsertNote({ ...note, title: "Offline edit" });

    expect(saved.title).toBe("Offline edit");
    expect(updateNoteItem).not.toHaveBeenCalled();

    const cached = await readNotesBootstrapFromCache(username);
    expect(cached?.data.notes[0]?.title).toBe("Offline edit");

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("upsert");
  });

  it("queues upsert when live API fails with a network error", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    vi.mocked(updateNoteItem).mockRejectedValue(new TypeError("network request failed"));

    const operations = createHybridNotesOperations(username);
    const saved = await operations.upsertNote({ ...note, title: "Queued edit" });

    expect(saved.title).toBe("Queued edit");
    expect(updateNoteItem).toHaveBeenCalledOnce();

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("upsert");
  });

  it("sets pendingSync on notes_notes row after offline upsert", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridNotesOperations(username);
    await operations.upsertNote({ ...note, title: "Pending edit" });

    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    const row = await notesNotesTable(db).get("note-1");
    expect(row?.pendingSync).toBe(true);
    expect(JSON.parse(row?.data ?? "{}").title).toBe("Pending edit");
  });
});
