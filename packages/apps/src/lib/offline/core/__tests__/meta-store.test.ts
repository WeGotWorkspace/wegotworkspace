import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readMeta, writeMeta } from "@/lib/offline/core/meta-store";

const username = "meta-user";

describe("core meta store", () => {
  it("returns null for missing keys", async () => {
    expect(await readMeta(username, "missing")).toBeNull();
  });

  it("round-trips values", async () => {
    await writeMeta(username, "token", "state-42");
    expect(await readMeta(username, "token")).toBe("state-42");
  });
});
