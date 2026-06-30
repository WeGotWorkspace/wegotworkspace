import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { driveUserTrashApiPath } from "@/drive-core/src/drive-path-utils";
import { readBrowserOnline } from "@/lib/offline/core/browser-online";
import { listOutboxMutations } from "@/lib/offline/core/outbox-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import {
  readDocsAvailability,
  writeDocsAvailability,
} from "@/lib/offline/docs/docs-availability-store";
import { createHybridDocsDriveOperations } from "@/lib/offline/docs/docs-hybrid-operations";
import { docsAvailabilityTable, docsListingRowsTable } from "@/lib/offline/docs/docs-schema";
import {
  readDocsListingFromCache,
  writeDocsListingToCache,
} from "@/lib/offline/docs-listing-offline-store";
import type { WgwUnifiedSearchResult } from "@/lib/api/wgw/search";

vi.mock("@/lib/offline/core/browser-online", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/offline/core/browser-online")>();
  return {
    ...actual,
    readBrowserOnline: vi.fn(() => false),
  };
});

vi.mock("@/lib/api/wgw/drive", () => ({
  createWgwDriveOperations: vi.fn(() => ({
    renameItem: vi.fn(),
    uploadFiles: vi.fn(),
  })),
}));

vi.mock("@/text-editor-core/docs-collab/docs-collab-persistence", () => ({
  clearDocsCollabOfflinePersistence: vi.fn(async () => undefined),
  migrateCollabPersistence: vi.fn(async () => undefined),
}));

const username = "alice";

function result(id: number, sourceKey: string, modifiedAt: number): WgwUnifiedSearchResult {
  return {
    id,
    sourceType: "file",
    sourceKey,
    title: sourceKey.split("/").pop() ?? sourceKey,
    extension: "md",
    category: "document",
    size: 100,
    modifiedAt,
  };
}

describe("createHybridDocsDriveOperations offline trash", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(readBrowserOnline).mockReturnValue(false);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await docsListingRowsTable(db).clear();
    await docsAvailabilityTable(db).clear();
  });

  it("queues trash and removes the file from listing and availability caches", async () => {
    const apiPath = "/users/alice/note.md";
    const filters = { pathPrefix: "users/alice" };
    await writeDocsListingToCache(username, filters, {
      results: [result(1, "users/alice/note.md", 100), result(2, "users/alice/other.md", 50)],
      hasMore: false,
    });
    await writeDocsAvailability(username, { id: "users/alice/note.md", location: "" });

    const operations = createHybridDocsDriveOperations(username);
    await operations.renameItem({
      from: apiPath,
      destination: driveUserTrashApiPath(username),
      to: "note.md",
    });

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("trash");
    expect(JSON.parse(outbox[0]?.payload ?? "{}")).toMatchObject({
      from: apiPath,
      destination: driveUserTrashApiPath(username),
      to: "note.md",
    });

    const cached = await readDocsListingFromCache(username, filters);
    expect(cached?.results.map((row) => row.sourceKey)).toEqual(["users/alice/other.md"]);

    expect(await readDocsAvailability(username, apiPath)).toBeUndefined();
  });
});

describe("createHybridDocsDriveOperations offline rename", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(readBrowserOnline).mockReturnValue(false);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await docsListingRowsTable(db).clear();
    await docsAvailabilityTable(db).clear();
  });

  it("queues rename and updates listing and availability caches", async () => {
    const fromPath = "/users/alice/old-name.md";
    const filters = { pathPrefix: "users/alice" };
    await writeDocsListingToCache(username, filters, {
      results: [result(1, "users/alice/old-name.md", 100), result(2, "users/alice/other.md", 50)],
      hasMore: false,
    });
    await writeDocsAvailability(username, { id: "users/alice/old-name.md", location: "My Drive" });

    const operations = createHybridDocsDriveOperations(username);
    await operations.renameItem({
      from: fromPath,
      destination: "/users/alice",
      to: "new-name.md",
    });

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("rename");
    expect(JSON.parse(outbox[0]?.payload ?? "{}")).toMatchObject({
      from: fromPath,
      destination: "/users/alice",
      to: "new-name.md",
    });

    const cached = await readDocsListingFromCache(username, filters);
    expect(cached?.results.map((row) => row.sourceKey)).toEqual([
      "users/alice/new-name.md",
      "users/alice/other.md",
    ]);
    expect(cached?.results.find((row) => row.sourceKey === "users/alice/new-name.md")?.title).toBe(
      "new-name.md",
    );

    expect(await readDocsAvailability(username, fromPath)).toBeUndefined();
    expect(await readDocsAvailability(username, "/users/alice/new-name.md")).toMatchObject({
      id: "users/alice/new-name.md",
      location: "My Drive",
    });
  });
});
