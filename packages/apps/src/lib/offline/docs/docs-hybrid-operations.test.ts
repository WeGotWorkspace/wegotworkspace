import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  listOutboxMutations,
  readFileFromCache,
  upsertFileInCache,
  writeDocsBootstrapToCache,
} from "@/lib/offline/docs/docs-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { docsFilesTable } from "@/lib/offline/docs/docs-schema";
import { createHybridDocsOperations } from "@/lib/offline/docs/docs-hybrid-operations";

const username = "alice";
const apiPath = "/users/alice/readme.md";

const bootstrap = {
  session: { ...mockWorkspaceSession, user: { ...mockWorkspaceSession.user, username } },
  data: { document: null },
};

const { loadFile, saveFile } = vi.hoisted(() => ({
  loadFile: vi.fn(),
  saveFile: vi.fn(),
}));

vi.mock("@/lib/offline/docs/docs-drive-operations", () => ({
  createWgwDocsDriveOperations: () => ({
    loadFile,
    saveFile,
    renameFile: vi.fn(),
  }),
}));

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

import { readBrowserOnline } from "@/lib/offline/core/browser-online";

describe("createHybridDocsOperations", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    loadFile.mockResolvedValue("Server content");
    saveFile.mockResolvedValue(undefined);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await docsFilesTable(db).clear();
    await db.meta.clear();
    await writeDocsBootstrapToCache(username, bootstrap);
    await upsertFileInCache(username, apiPath, "Cached content", false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues save offline and updates IndexedDB when navigator.onLine is false", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridDocsOperations(username);
    await operations.saveFile(apiPath, "Offline edit");

    expect(saveFile).not.toHaveBeenCalled();

    const cached = await readFileFromCache(username, apiPath);
    expect(cached?.content).toBe("Offline edit");

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("save");
  });

  it("queues save when live API fails with a network error", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    saveFile.mockRejectedValue(new TypeError("network request failed"));

    const operations = createHybridDocsOperations(username);
    await operations.saveFile(apiPath, "Queued edit");

    expect(saveFile).toHaveBeenCalledOnce();

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("save");
  });

  it("sets pendingSync on docs_files row after offline save", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridDocsOperations(username);
    await operations.saveFile(apiPath, "Pending edit");

    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    const row = await docsFilesTable(db).get(apiPath);
    expect(row?.pendingSync).toBe(true);
    expect(row?.content).toBe("Pending edit");
  });
});
