import { describe, expect, it, vi } from "vitest";
import {
  ConnectivitySyncRunner,
  ConnectivitySyncRunnerRegistry,
} from "@/lib/offline/core/connectivity-sync-runner";

describe("ConnectivitySyncRunner", () => {
  it("returns undefined when a flush is already in flight", async () => {
    let resolveFlush!: () => void;
    const flushTask = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
    );
    const runner = new ConnectivitySyncRunner(flushTask);

    const first = runner.flush();
    const second = runner.flush();

    expect(flushTask).toHaveBeenCalledTimes(1);
    expect(await second).toBeUndefined();

    resolveFlush();
    await first;
  });

  it("allows a new flush after the previous one completes", async () => {
    const flushTask = vi.fn(async () => "done" as const);
    const runner = new ConnectivitySyncRunner(flushTask);

    expect(await runner.flush()).toBe("done");
    expect(await runner.flush()).toBe("done");
    expect(flushTask).toHaveBeenCalledTimes(2);
  });
});

describe("ConnectivitySyncRunnerRegistry", () => {
  it("returns the same runner for the same username", () => {
    const registry = new ConnectivitySyncRunnerRegistry<void>();
    const flushTask = vi.fn(async () => undefined);

    const a = registry.getOrCreate("user-a", flushTask);
    const b = registry.getOrCreate("user-a", flushTask);

    expect(a).toBe(b);
  });

  it("creates distinct runners per username", () => {
    const registry = new ConnectivitySyncRunnerRegistry<void>();
    const flushTask = vi.fn(async () => undefined);

    const a = registry.getOrCreate("user-a", flushTask);
    const b = registry.getOrCreate("user-b", flushTask);

    expect(a).not.toBe(b);
  });

  it("ignores flushTask on subsequent getOrCreate for the same username", async () => {
    const registry = new ConnectivitySyncRunnerRegistry<string>();
    const firstTask = vi.fn(async () => "first");
    const secondTask = vi.fn(async () => "second");

    const runner = registry.getOrCreate("user-a", firstTask);
    registry.getOrCreate("user-a", secondTask);

    expect(await runner.flush()).toBe("first");
    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(secondTask).not.toHaveBeenCalled();
  });
});
