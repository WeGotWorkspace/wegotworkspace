import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import {
  applyDocsStarToggle,
  readDocsStarredPaths,
  writeDocsStarredPaths,
} from "@/lib/offline/docs/docs-stars-store";

const username = "alice";

describe("docs stars store", () => {
  beforeEach(async () => {
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.meta.clear();
  });

  it("round-trips starred paths through meta", async () => {
    await writeDocsStarredPaths(username, ["/users/alice/A.md", "/users/alice/B.md"]);
    expect(await readDocsStarredPaths(username)).toEqual([
      "/users/alice/A.md",
      "/users/alice/B.md",
    ]);
  });

  it("applies star toggles to the cached set", async () => {
    await writeDocsStarredPaths(username, ["/users/alice/A.md"]);
    await applyDocsStarToggle(username, "/users/alice/B.md", true);
    await applyDocsStarToggle(username, "/users/alice/A.md", false);
    expect(await readDocsStarredPaths(username)).toEqual(["/users/alice/B.md"]);
  });
});
