import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { enqueueCoalescedOutboxUpdate } from "@/lib/offline/core/outbox-coalescing";
import { listOutboxMutations } from "@/lib/offline/core/outbox-store";
import type { OfflineOutboxRow } from "@/lib/offline/core/types";

const username = "coalesce-user";
const domain = "notes";

type NotePatch = { title?: string; body?: string };

const coalesceConfig = {
  mergePatches: (a: NotePatch, b: NotePatch): NotePatch => ({ ...a, ...b }),
  entityIdFromRow: (row: OfflineOutboxRow): string | null => {
    try {
      const payload = JSON.parse(row.payload) as { noteId?: string };
      return payload.noteId ?? null;
    } catch {
      return null;
    }
  },
  buildUpdatePayload: (noteId: string, patch: NotePatch) => ({ noteId, patch }),
  readPatchFromPayload: (payload: Record<string, unknown>) => payload.patch as NotePatch,
};

describe("enqueueCoalescedOutboxUpdate", () => {
  beforeEach(async () => {
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
  });

  it("enqueues a new update when no pending row exists for the entity", async () => {
    await enqueueCoalescedOutboxUpdate({
      username,
      domain,
      entityId: "note-1",
      patch: { title: "Draft" },
      ifInState: "v1",
      ...coalesceConfig,
    });

    const rows = await listOutboxMutations(username);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.domain).toBe(domain);
    expect(rows[0]?.op).toBe("update");
    expect(rows[0]?.ifInState).toBe("v1");
    const payload = JSON.parse(rows[0]?.payload ?? "{}") as {
      noteId: string;
      patch: NotePatch;
    };
    expect(payload.noteId).toBe("note-1");
    expect(payload.patch).toEqual({ title: "Draft" });
  });

  it("merges patches into an existing update row for the same entity", async () => {
    await enqueueCoalescedOutboxUpdate({
      username,
      domain,
      entityId: "note-1",
      patch: { title: "First" },
      ifInState: "v1",
      ...coalesceConfig,
    });
    await enqueueCoalescedOutboxUpdate({
      username,
      domain,
      entityId: "note-1",
      patch: { body: "Added later" },
      ifInState: "v2",
      ...coalesceConfig,
    });

    const rows = await listOutboxMutations(username);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ifInState).toBe("v1");
    const payload = JSON.parse(rows[0]?.payload ?? "{}") as {
      noteId: string;
      patch: NotePatch;
    };
    expect(payload.patch).toEqual({ title: "First", body: "Added later" });
  });

  it("keeps separate rows for different entities in the same domain", async () => {
    await enqueueCoalescedOutboxUpdate({
      username,
      domain,
      entityId: "note-a",
      patch: { title: "A" },
      ...coalesceConfig,
    });
    await enqueueCoalescedOutboxUpdate({
      username,
      domain,
      entityId: "note-b",
      patch: { title: "B" },
      ...coalesceConfig,
    });

    const rows = await listOutboxMutations(username);
    expect(rows).toHaveLength(2);
  });
});
