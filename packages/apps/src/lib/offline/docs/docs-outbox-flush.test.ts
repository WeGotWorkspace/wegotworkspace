import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueOutboxMutation } from "@/lib/offline/core/outbox-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { DOCS_DOMAIN } from "@/lib/offline/docs/docs-schema";
import { flushDocsOutbox } from "@/lib/offline/docs/docs-outbox-flush";

const renameItem = vi.fn();
const uploadFiles = vi.fn();
const setStar = vi.fn();

vi.mock("@/lib/api/wgw/drive", () => ({
  createWgwDriveOperations: vi.fn(() => ({
    renameItem,
    uploadFiles,
    setStar,
  })),
}));

describe("flushDocsOutbox", () => {
  const username = "alice";

  beforeEach(async () => {
    renameItem.mockReset();
    uploadFiles.mockReset();
    setStar.mockReset();
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
  });

  it("reports state mismatches for 409/412 drive failures", async () => {
    await enqueueOutboxMutation(username, {
      id: "rename-1",
      domain: DOCS_DOMAIN,
      op: "rename",
      payload: JSON.stringify({
        op: "rename",
        from: "/users/alice/doc.md",
        destination: "/users/alice",
        to: "doc-renamed.md",
      }),
    });

    renameItem.mockRejectedValue(Object.assign(new Error("Precondition failed"), { status: 412 }));

    const result = await flushDocsOutbox(username);

    expect(result.flushed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.stateMismatches).toEqual(["users/alice/doc.md"]);
  });
});
