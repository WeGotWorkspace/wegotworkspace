import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  enqueueCoalescedDocSave,
  readFileFromCache,
  writeDocsBootstrapToCache,
  writeFileSyncBaseline,
} from "@/lib/offline/docs/docs-offline-store";
import { flushDocsOutbox } from "@/lib/offline/docs/docs-outbox-flush";

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
}));

describe("flushDocsOutbox", () => {
  beforeEach(async () => {
    loadFile.mockReset();
    saveFile.mockReset();
    loadFile.mockResolvedValue("Baseline content");
    saveFile.mockResolvedValue(undefined);
    await writeDocsBootstrapToCache(username, bootstrap);
    await writeFileSyncBaseline(username, apiPath, "Baseline content");
  });

  it("flushes a coalesced offline save once", async () => {
    await enqueueCoalescedDocSave(username, apiPath, "Draft v1", "Baseline content");
    await enqueueCoalescedDocSave(username, apiPath, "Draft v2", "Baseline content");

    await flushDocsOutbox(username);

    expect(saveFile).toHaveBeenCalledOnce();
    expect(saveFile).toHaveBeenCalledWith(apiPath, "Draft v2");

    const cached = await readFileFromCache(username, apiPath);
    expect(cached?.content).toBe("Draft v2");
  });

  it("marks stateMismatch when server content changed since baseline", async () => {
    loadFile.mockResolvedValue("Server changed content");
    await enqueueCoalescedDocSave(username, apiPath, "Local draft", "Baseline content");

    const result = await flushDocsOutbox(username);

    expect(result.stateMismatches).toEqual([apiPath]);
    expect(saveFile).not.toHaveBeenCalled();
  });
});
