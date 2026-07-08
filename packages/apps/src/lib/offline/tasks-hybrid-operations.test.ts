import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import type { Task } from "@/tasks-core/src/tasks-types";
import {
  listOutboxMutations,
  readTasksBootstrapFromCache,
  writeTasksBootstrapToCache,
} from "@/lib/offline/tasks-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/offline-db";
import { tasksItemsTable, tasksListsTable } from "@/lib/offline/tasks/tasks-schema";
import { createHybridTasksOperations } from "@/lib/offline/tasks-hybrid-operations";

const username = "alice";
const bootstrap = createTasksAppBootstrap({
  session: {
    ...createTasksAppBootstrap().session,
    user: { ...createTasksAppBootstrap().session.user, username },
  },
});

const task = {
  ...bootstrap.data.tasks[0]!,
  etag: "etag-1",
} as Task & { etag?: string };

const seededBootstrap = {
  ...bootstrap,
  data: {
    ...bootstrap.data,
    tasks: bootstrap.data.tasks.map((entry) => (entry.id === task.id ? (task as Task) : entry)),
  },
};

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

vi.mock("@/lib/api/wgw/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/tasks")>();
  return {
    ...actual,
    patchTask: vi.fn(),
    getTask: vi.fn(),
  };
});

import { patchTask } from "@/lib/api/wgw/tasks";
import { readBrowserOnline } from "@/lib/offline/core/browser-online";

describe("createHybridTasksOperations", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await tasksItemsTable(db).clear();
    await tasksListsTable(db).clear();
    await db.meta.clear();
    await writeTasksBootstrapToCache(username, seededBootstrap);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues patch offline and updates IndexedDB when navigator.onLine is false", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridTasksOperations(username);
    const saved = await operations.patchTask(task.id, { title: "Updated offline" });

    expect(saved.title).toBe("Updated offline");
    expect(patchTask).not.toHaveBeenCalled();

    const cached = await readTasksBootstrapFromCache(username);
    expect(cached?.data.tasks.find((entry) => entry.id === task.id)?.title).toBe("Updated offline");

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("update");
    expect(outbox[0]?.ifInState).toBe("etag-1");
  });

  it("queues patch when live API fails with a network error", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    vi.mocked(patchTask).mockRejectedValue(new TypeError("network request failed"));

    const operations = createHybridTasksOperations(username);
    const saved = await operations.patchTask(task.id, { title: "Queued after network error" });

    expect(saved.title).toBe("Queued after network error");
    expect(patchTask).toHaveBeenCalledOnce();

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("update");
  });
});
