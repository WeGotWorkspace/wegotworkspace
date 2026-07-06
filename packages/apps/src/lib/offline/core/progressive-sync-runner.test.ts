import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runProgressiveSync } from "@/lib/offline/core/progressive-sync-runner";
import { readMeta } from "@/lib/offline/core/meta-store";

describe("runProgressiveSync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("runs items with bounded concurrency and writes progress", async () => {
    const syncOne = vi.fn(async () => undefined);
    const result = await runProgressiveSync({
      username: "alice",
      metaKey: "test:progress",
      items: ["a", "b", "c"],
      concurrency: 2,
      syncOne,
    });

    expect(syncOne).toHaveBeenCalledTimes(3);
    expect(result.total).toBe(3);
    expect(result.synced).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.running).toBe(false);

    const raw = await readMeta("alice", "test:progress");
    expect(raw).toBeTruthy();
  });

  it("counts failures without stopping the queue", async () => {
    const syncOne = vi.fn(async (item: string) => {
      if (item === "bad") throw new Error("fail");
    });
    const result = await runProgressiveSync({
      username: "bob",
      metaKey: "test:progress-fail",
      items: ["ok", "bad"],
      syncOne,
    });
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
  });
});
