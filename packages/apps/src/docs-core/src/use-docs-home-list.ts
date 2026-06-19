import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchWgwUnifiedSearch,
  type WgwUnifiedSearchData,
  type WgwUnifiedSearchParams,
  type WgwUnifiedSearchResult,
} from "@/lib/api/wgw/search";
import type { DriveFile } from "@/drive-core/src/drive-models";
import {
  apiPathFromSearchSourceKey,
  driveFileFromSearchResult,
} from "@/drive-core/src/drive-search-utils";
import { uiPathFromApiPath } from "@/drive-core/src/drive-path-utils";
import {
  DOCS_HOME_CATEGORIES,
  DOCS_HOME_EXTENSIONS,
  DOCS_HOME_PAGE_SIZE,
  DOCS_HOME_SOURCES,
} from "@/docs-core/src/docs-home-constants";

export type DocsHomeFetcher = (
  params: Omit<WgwUnifiedSearchParams, "signal"> & { signal?: AbortSignal },
) => Promise<WgwUnifiedSearchData>;

export type UseDocsHomeListOptions = {
  /** Current user login/handle; used to map API source keys to UI paths. */
  username: string;
  /** Optional home search box value; debounced and resets pagination on change. */
  query?: string;
  /**
   * Optional storage-key prefix scoping the browse to a single drive
   * (e.g. `users/alice` for My Drive, `groups/team` for a shared drive).
   * Changing it resets pagination and reloads from offset 0.
   */
  pathPrefix?: string;
  /** Injectable fetcher (mock in Storybook/Vitest); defaults to the live client. */
  fetcher?: DocsHomeFetcher;
  pageSize?: number;
  debounceMs?: number;
};

export type UseDocsHomeListResult = {
  files: DriveFile[];
  /** Initial load or query-change reload in flight. */
  loading: boolean;
  /** A `loadMore()` page request is in flight. */
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
};

/** Sort raw browse results newest-first (client-side safety net over server order). */
export function sortDocsHomeResults(
  results: readonly WgwUnifiedSearchResult[],
): WgwUnifiedSearchResult[] {
  return [...results].sort((a, b) => {
    const am = a.modifiedAt ?? 0;
    const bm = b.modifiedAt ?? 0;
    if (bm !== am) return bm - am;
    return b.id - a.id;
  });
}

/** Map browse results to `DriveFile`s (deduped by source key, modified-desc). */
export function mapDocsHomeResults(
  results: readonly WgwUnifiedSearchResult[],
  username: string,
): DriveFile[] {
  const seen = new Set<string>();
  const files: DriveFile[] = [];
  for (const result of sortDocsHomeResults(results)) {
    const apiPath = apiPathFromSearchSourceKey(result.sourceKey);
    if (!apiPath || seen.has(result.sourceKey)) continue;
    seen.add(result.sourceKey);
    const uiPath = uiPathFromApiPath(apiPath, username);
    files.push(driveFileFromSearchResult(result, uiPath, apiPath));
  }
  return files;
}

export function useDocsHomeList({
  username,
  query = "",
  pathPrefix,
  fetcher = fetchWgwUnifiedSearch,
  pageSize = DOCS_HOME_PAGE_SIZE,
  debounceMs = 300,
}: UseDocsHomeListOptions): UseDocsHomeListResult {
  const [results, setResults] = useState<WgwUnifiedSearchResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState(() => query.trim());

  useEffect(() => {
    const trimmed = query.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, debounceMs]);

  const scopePrefix = pathPrefix?.trim() ?? "";
  const baseParams = useMemo(
    () => ({
      sources: [...DOCS_HOME_SOURCES],
      extensions: [...DOCS_HOME_EXTENSIONS],
      categories: [...DOCS_HOME_CATEGORIES],
      limit: pageSize,
      ...(scopePrefix ? { pathPrefix: scopePrefix } : {}),
    }),
    [pageSize, scopePrefix],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    void (async () => {
      try {
        const data = await fetcher({
          ...baseParams,
          q: debouncedQuery || undefined,
          offset: 0,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults(data.results ?? []);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load documents");
        setResults([]);
        setHasMore(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [debouncedQuery, baseParams, fetcher, reloadToken]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const controller = new AbortController();
    setLoadingMore(true);
    void (async () => {
      try {
        const data = await fetcher({
          ...baseParams,
          q: debouncedQuery || undefined,
          offset: results.length,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults((prev) => [...prev, ...(data.results ?? [])]);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        if (!controller.signal.aborted) setLoadingMore(false);
      }
    })();
  }, [loading, loadingMore, hasMore, fetcher, baseParams, debouncedQuery, results.length]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const files = useMemo(() => mapDocsHomeResults(results, username), [results, username]);

  return { files, loading, loadingMore, error, hasMore, loadMore, reload };
}
