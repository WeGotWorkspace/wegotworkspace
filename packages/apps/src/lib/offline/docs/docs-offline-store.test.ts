import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createDocsAppBootstrap } from "@/lib/api/mock/docs-bootstrap";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { DOCS_DOMAIN } from "@/lib/offline/docs/docs-schema";
import {
  enqueueCoalescedDocSave,
  enqueueOutboxMutation,
  listOutboxMutations,
  readDocsBootstrapFromCache,
  readFileFromCache,
  upsertFileInCache,
  writeDocsBootstrapToCache,
} from "@/lib/offline/docs/docs-offline-store";

const username = "alice";
const apiPath = "/users/alice/readme.md";

const bootstrap = {
  session: { ...mockWorkspaceSession, user: { ...mockWorkspaceSession.user, username } },
  data: { document: null },
} satisfies ReturnType<typeof createDocsAppBootstrap>;

describe("docs offline store", () => {
  beforeEach(async () => {
    await writeDocsBootstrapToCache(username, bootstrap);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await db.table("docs_files").clear();
  });

  it("reads bootstrap written to cache", async () => {
    const cached = await readDocsBootstrapFromCache(username);
    expect(cached?.session.user.username).toBe("alice");
  });

  it("preserves pendingSync files when content is rewritten from server", async () => {
    await upsertFileInCache(username, apiPath, "Local content", true);

    await upsertFileInCache(username, apiPath, "Server content", false);

    const cached = await readFileFromCache(username, apiPath);
    expect(cached?.content).toBe("Local content");
  });

  it("coalesces pending save rows for the same file", async () => {
    await enqueueCoalescedDocSave(username, apiPath, "Draft v1", "Baseline");
    await enqueueCoalescedDocSave(username, apiPath, "Draft v2", "Baseline");

    const rows = await listOutboxMutations(username);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.op).toBe("save");
    expect(JSON.parse(rows[0]?.payload ?? "{}").content).toBe("Draft v2");
  });

  it("queues rename mutations under the docs domain", async () => {
    await enqueueOutboxMutation(username, {
      id: crypto.randomUUID(),
      domain: DOCS_DOMAIN,
      op: "rename",
      payload: JSON.stringify({ apiPath, newName: "notes.md" }),
    });

    const rows = await listOutboxMutations(username);
    expect(rows[0]?.domain).toBe(DOCS_DOMAIN);
    expect(rows[0]?.op).toBe("rename");
  });
});
