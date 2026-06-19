import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WgwUnifiedSearchData, WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import {
  mapDocsHomeResults,
  sortDocsHomeResults,
  useDocsHomeList,
  type DocsHomeFetcher,
} from "@/docs-core/src/use-docs-home-list";

function result(
  id: number,
  sourceKey: string,
  title: string,
  modifiedAt: number,
): WgwUnifiedSearchResult {
  return {
    id,
    sourceType: "file",
    sourceKey,
    title,
    extension: sourceKey.split(".").pop() ?? "md",
    category: "document",
    size: 100,
    modifiedAt,
  };
}

const FIXTURES = [
  result(1, "users/alice/A.md", "A", 500),
  result(2, "groups/eng/B.md", "B", 400),
  result(3, "users/alice/C.txt", "C", 300),
  result(4, "groups/design/D.md", "D", 200),
  result(5, "users/alice/E.md", "E", 100),
];

function createFetcher(all: WgwUnifiedSearchResult[], pageSize = 2): DocsHomeFetcher {
  return vi.fn(async (params): Promise<WgwUnifiedSearchData> => {
    const q = (params.q ?? "").trim().toLowerCase();
    const filtered = q ? all.filter((item) => item.title.toLowerCase().includes(q)) : all;
    const start = params.offset ?? 0;
    const results = filtered.slice(start, start + pageSize);
    return {
      query: params.q ?? "",
      limit: params.limit ?? pageSize,
      offset: start,
      hasMore: start + results.length < filtered.length,
      sources: params.sources ?? ["file"],
      filters: {},
      results,
    };
  });
}

describe("sortDocsHomeResults", () => {
  it("orders newest first, tie-breaking on id descending", () => {
    const unsorted = [
      result(10, "users/alice/x.md", "X", 100),
      result(11, "users/alice/y.md", "Y", 300),
      result(12, "users/alice/z.md", "Z", 300),
    ];
    expect(sortDocsHomeResults(unsorted).map((item) => item.id)).toEqual([12, 11, 10]);
  });
});

describe("mapDocsHomeResults", () => {
  it("maps to drive files, sorts modified-desc, and derives the location label", () => {
    const files = mapDocsHomeResults([FIXTURES[2], FIXTURES[0], FIXTURES[1]], "alice");
    expect(files.map((f) => f.title)).toEqual(["A", "B", "C"]);
    expect(files[0]).toMatchObject({
      title: "A",
      location: "My Drive",
      kind: "doc",
      apiPath: "/users/alice/A.md",
    });
    expect(files[1].location).toBe("Groups/eng");
  });

  it("dedupes repeated source keys", () => {
    const dup = result(9, "users/alice/A.md", "A copy", 999);
    const files = mapDocsHomeResults([FIXTURES[0], dup], "alice");
    expect(files).toHaveLength(1);
    expect(files[0].title).toBe("A copy");
  });
});

describe("useDocsHomeList", () => {
  it("loads the first page and paginates with loadMore", async () => {
    const fetcher = createFetcher(FIXTURES, 2);
    const { result: hook } = renderHook(() =>
      useDocsHomeList({ username: "alice", fetcher, debounceMs: 0 }),
    );

    await waitFor(() => expect(hook.current.loading).toBe(false));
    expect(hook.current.files.map((f) => f.title)).toEqual(["A", "B"]);
    expect(hook.current.hasMore).toBe(true);

    act(() => hook.current.loadMore());
    await waitFor(() => expect(hook.current.files).toHaveLength(4));
    expect(hook.current.files.map((f) => f.title)).toEqual(["A", "B", "C", "D"]);
    expect(hook.current.hasMore).toBe(true);

    act(() => hook.current.loadMore());
    await waitFor(() => expect(hook.current.hasMore).toBe(false));
    expect(hook.current.files).toHaveLength(5);
  });

  it("re-sorts appended pages modified-desc as a safety net", async () => {
    const outOfOrder = [
      result(1, "users/alice/old.md", "Old", 100),
      result(2, "users/alice/new.md", "New", 900),
    ];
    const fetcher = createFetcher(outOfOrder, 1);
    const { result: hook } = renderHook(() =>
      useDocsHomeList({ username: "alice", fetcher, debounceMs: 0 }),
    );

    await waitFor(() => expect(hook.current.loading).toBe(false));
    act(() => hook.current.loadMore());
    await waitFor(() => expect(hook.current.files).toHaveLength(2));
    expect(hook.current.files.map((f) => f.title)).toEqual(["New", "Old"]);
  });

  it("debounces the query and resets pagination", async () => {
    const fetcher = createFetcher(FIXTURES, 2);
    const { result: hook, rerender } = renderHook(
      ({ q }) => useDocsHomeList({ username: "alice", query: q, fetcher, debounceMs: 0 }),
      { initialProps: { q: "" } },
    );

    await waitFor(() => expect(hook.current.files).toHaveLength(2));

    rerender({ q: "d" });
    await waitFor(() => expect(hook.current.files.map((f) => f.title)).toEqual(["D"]));
    expect(hook.current.hasMore).toBe(false);
  });
});
