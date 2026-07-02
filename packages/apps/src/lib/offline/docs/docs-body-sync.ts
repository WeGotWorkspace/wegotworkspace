import type { WgwUnifiedSearchParams, WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import { fetchWgwUnifiedSearch } from "@/lib/api/wgw/search";
import {
  DOCS_HOME_CATEGORIES,
  DOCS_HOME_EXTENSIONS,
  DOCS_HOME_PAGE_SIZE,
  DOCS_HOME_SOURCES,
} from "@/docs-core/src/docs-home-constants";
import {
  fetchAllDocsHomeListingPages,
  sortDocsHomeResults,
  type DocsHomeFetcher,
} from "@/docs-core/src/use-docs-home-list";
import { getConnectivitySnapshot } from "@/lib/offline/core/browser-online";
import { readMeta, writeMeta } from "@/lib/offline/core/meta-store";
import { makeDocsOfflineAvailable } from "@/lib/offline/docs/docs-offline-pin-core";

const DOCS_BODY_SYNC_META_KEY = "docs:auto-sync:body-progress";
const DOCS_BODY_SYNC_CONCURRENCY = 4;

export type DocsBodySyncProgress = {
  running: boolean;
  total: number;
  synced: number;
  failed: number;
  updatedAt: number;
};

function emptyProgress(): DocsBodySyncProgress {
  return {
    running: false,
    total: 0,
    synced: 0,
    failed: 0,
    updatedAt: Date.now(),
  };
}

function normalizeSourceKey(sourceKey: string): string {
  return sourceKey.trim().replace(/^\/+/, "");
}

function sourceExt(sourceKey: string): string {
  const file = normalizeSourceKey(sourceKey).split("/").pop() ?? "";
  const dot = file.lastIndexOf(".");
  return dot >= 0 ? file.slice(dot + 1).toLowerCase() : "";
}

function isSupportedHomeDoc(sourceKey: string, username: string): boolean {
  const normalized = normalizeSourceKey(sourceKey);
  if (!normalized) return false;
  if (
    !DOCS_HOME_EXTENSIONS.includes(sourceExt(normalized) as (typeof DOCS_HOME_EXTENSIONS)[number])
  ) {
    return false;
  }
  if (normalized.startsWith(`users/${username}/`)) return true;
  return normalized.startsWith("groups/");
}

function fileLocationFromSourceKey(sourceKey: string, username: string): string {
  const normalized = normalizeSourceKey(sourceKey);
  if (normalized.startsWith(`users/${username}/`)) return "My Drive";
  if (normalized.startsWith("groups/")) {
    const group = normalized.split("/")[1] ?? "Group";
    return `Group: ${group}`;
  }
  return "Documents";
}

async function writeProgress(username: string, progress: DocsBodySyncProgress): Promise<void> {
  await writeMeta(username, DOCS_BODY_SYNC_META_KEY, JSON.stringify(progress));
}

export async function readDocsBodySyncProgress(username: string): Promise<DocsBodySyncProgress> {
  const raw = await readMeta(username, DOCS_BODY_SYNC_META_KEY);
  if (!raw) return emptyProgress();
  try {
    return {
      ...emptyProgress(),
      ...(JSON.parse(raw) as Partial<DocsBodySyncProgress>),
      updatedAt: Date.now(),
    };
  } catch {
    return emptyProgress();
  }
}

export async function syncDocsBodiesFromListingResults(
  username: string,
  results: readonly WgwUnifiedSearchResult[],
  options?: { signal?: AbortSignal },
): Promise<DocsBodySyncProgress> {
  if (!username || !getConnectivitySnapshot()) return emptyProgress();
  const signal = options?.signal;
  const newestFirst = sortDocsHomeResults(results);
  const queue = newestFirst.filter((row) => isSupportedHomeDoc(row.sourceKey, username));
  const progress: DocsBodySyncProgress = {
    running: true,
    total: queue.length,
    synced: 0,
    failed: 0,
    updatedAt: Date.now(),
  };
  await writeProgress(username, progress);

  let cursor = 0;
  const next = (): WgwUnifiedSearchResult | undefined => {
    const row = queue[cursor];
    cursor += 1;
    return row;
  };

  const worker = async () => {
    while (true) {
      if (signal?.aborted) return;
      const row = next();
      if (!row) return;
      const apiPath = `/${normalizeSourceKey(row.sourceKey)}`;
      try {
        await makeDocsOfflineAvailable(
          username,
          apiPath,
          fileLocationFromSourceKey(row.sourceKey, username),
        );
        progress.synced += 1;
      } catch {
        progress.failed += 1;
      }
      progress.updatedAt = Date.now();
      await writeProgress(username, progress);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(DOCS_BODY_SYNC_CONCURRENCY, Math.max(queue.length, 1)) }, () =>
      worker(),
    ),
  );

  progress.running = false;
  progress.updatedAt = Date.now();
  await writeProgress(username, progress);
  return progress;
}

export async function syncDocsBodiesFromHomeListing(
  username: string,
  options?: {
    fetcher?: DocsHomeFetcher;
    signal?: AbortSignal;
  },
): Promise<DocsBodySyncProgress> {
  if (!username || !getConnectivitySnapshot()) return emptyProgress();
  const fetcher = options?.fetcher ?? fetchWgwUnifiedSearch;
  const signal = options?.signal;
  const params: Omit<WgwUnifiedSearchParams, "signal" | "q" | "offset"> & { limit: number } = {
    sources: [...DOCS_HOME_SOURCES],
    extensions: [...DOCS_HOME_EXTENSIONS],
    categories: [...DOCS_HOME_CATEGORIES],
    limit: DOCS_HOME_PAGE_SIZE,
  };

  const { results } = await fetchAllDocsHomeListingPages(
    fetcher,
    params,
    "",
    signal ?? new AbortController().signal,
  );
  return syncDocsBodiesFromListingResults(username, results, { signal });
}
