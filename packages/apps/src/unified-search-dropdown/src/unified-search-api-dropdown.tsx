import { useEffect, useMemo, useState } from "react";
import {
  fetchWgwUnifiedSearch,
  type WgwUnifiedSearchData,
  type WgwUnifiedSearchParams,
  type WgwUnifiedSearchResult,
} from "@/lib/api/wgw/search";
import {
  UnifiedSearchResultsDropdown,
  type UnifiedSearchResultsDropdownProps,
} from "@/unified-search-dropdown/src/unified-search-results-dropdown";

export type UnifiedSearchApiDropdownProps = {
  query: string;
  limit?: number;
  minQueryLength?: number;
  debounceMs?: number;
  sources?: string[];
  categories?: string[];
  extensions?: string[];
  modifiedFrom?: string | Date;
  modifiedTo?: string | Date;
  className?: string;
  onSelect?: (result: WgwUnifiedSearchResult) => void;
  fetcher?: (
    params: Omit<WgwUnifiedSearchParams, "signal"> & { signal?: AbortSignal },
  ) => Promise<WgwUnifiedSearchData>;
  emptyLabel?: UnifiedSearchResultsDropdownProps["emptyLabel"];
  promptLabel?: UnifiedSearchResultsDropdownProps["promptLabel"];
};

export function UnifiedSearchApiDropdown({
  query,
  limit = 10,
  minQueryLength = 2,
  debounceMs = 150,
  sources,
  categories,
  extensions,
  modifiedFrom,
  modifiedTo,
  className,
  onSelect,
  fetcher = fetchWgwUnifiedSearch,
  emptyLabel,
  promptLabel,
}: UnifiedSearchApiDropdownProps) {
  const trimmedQuery = query.trim();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WgwUnifiedSearchResult[]>([]);

  const requestParams = useMemo(
    () => ({
      q: trimmedQuery,
      limit,
      sources,
      categories,
      extensions,
      modifiedFrom,
      modifiedTo,
    }),
    [trimmedQuery, limit, sources, categories, extensions, modifiedFrom, modifiedTo],
  );

  useEffect(() => {
    if (trimmedQuery.length < minQueryLength) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetcher({ ...requestParams, signal: abortController.signal });
        if (!abortController.signal.aborted) {
          setResults(data.results ?? []);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [trimmedQuery, minQueryLength, debounceMs, fetcher, requestParams]);

  if (trimmedQuery.length < minQueryLength && !loading && !error) {
    return null;
  }

  return (
    <UnifiedSearchResultsDropdown
      query={query}
      loading={loading}
      error={error}
      results={results}
      maxResults={limit}
      className={className}
      onSelect={onSelect}
      emptyLabel={emptyLabel}
      promptLabel={promptLabel}
    />
  );
}
