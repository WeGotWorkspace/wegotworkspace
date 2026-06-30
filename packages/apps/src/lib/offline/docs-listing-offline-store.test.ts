import "fake-indexeddb/auto";
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import { docsListingCacheKey } from "@/lib/offline/docs/docs-listing-cache-key";
import {
  readDocsListingFromCache,
  upsertDocsListingResult,
  writeDocsListingToCache,
} from "@/lib/offline/docs-listing-offline-store";

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

const filters = { pathPrefix: "users/alice", query: "" };

describe("docs listing offline store", () => {
  beforeEach(async () => {
    // Each test uses the shared username against an isolated fake IndexedDB.
  });

  it("writes and reads browse rows in modified-desc order", async () => {
    await writeDocsListingToCache(username, filters, {
      results: [
        result(1, "users/alice/old.md", 100),
        result(2, "users/alice/new.md", 900),
        result(3, "users/alice/mid.md", 500),
      ],
      hasMore: false,
    });

    const cached = await readDocsListingFromCache(username, filters);
    expect(cached?.results.map((row) => row.id)).toEqual([2, 3, 1]);
  });

  it("scopes cache entries by browse filter key", async () => {
    await writeDocsListingToCache(username, filters, {
      results: [result(1, "users/alice/a.md", 100)],
      hasMore: false,
    });
    await writeDocsListingToCache(
      username,
      { ...filters, query: "b" },
      {
        results: [result(2, "users/alice/b.md", 200)],
        hasMore: false,
      },
    );

    expect(await readDocsListingFromCache(username, filters)).toMatchObject({
      results: [expect.objectContaining({ sourceKey: "users/alice/a.md" })],
    });
    expect(await readDocsListingFromCache(username, { ...filters, query: "b" })).toMatchObject({
      results: [expect.objectContaining({ sourceKey: "users/alice/b.md" })],
    });
    expect(docsListingCacheKey(filters)).not.toBe(docsListingCacheKey({ ...filters, query: "b" }));
  });

  it("replaces prior rows for the same cache key on rewrite", async () => {
    await writeDocsListingToCache(username, filters, {
      results: [result(1, "users/alice/a.md", 100)],
      hasMore: false,
    });
    await writeDocsListingToCache(username, filters, {
      results: [result(2, "users/alice/b.md", 200)],
      hasMore: false,
    });

    const cached = await readDocsListingFromCache(username, filters);
    expect(cached?.results).toHaveLength(1);
    expect(cached?.results[0]?.sourceKey).toBe("users/alice/b.md");
  });

  it("upserts an offline-created document into all-docs and drive-scoped caches", async () => {
    const allDocsFilters = {
      sources: ["file"] as const,
      extensions: ["md", "markdown", "txt"] as const,
      categories: ["document"] as const,
    };
    await writeDocsListingToCache(username, allDocsFilters, {
      results: [result(1, "users/alice/existing.md", 100)],
      hasMore: false,
    });
    await writeDocsListingToCache(username, filters, {
      results: [result(1, "users/alice/existing.md", 100)],
      hasMore: false,
    });

    await upsertDocsListingResult(username, "/users/alice/new-offline.md");

    const allDocs = await readDocsListingFromCache(username, allDocsFilters);
    expect(allDocs?.results.map((row) => row.sourceKey)).toEqual([
      "users/alice/new-offline.md",
      "users/alice/existing.md",
    ]);

    const scoped = await readDocsListingFromCache(username, filters);
    expect(scoped?.results.map((row) => row.sourceKey)).toEqual([
      "users/alice/new-offline.md",
      "users/alice/existing.md",
    ]);
  });
});
