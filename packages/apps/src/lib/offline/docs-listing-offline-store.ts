import type { WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import { sortDocsHomeResults } from "@/docs-core/src/use-docs-home-list";
import { rememberOfflineDocsUsername } from "@/lib/offline/offline-session";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { readMeta, writeMeta } from "@/lib/offline/core/meta-store";
import {
  docsListingCacheKey,
  type DocsListingBrowseFilters,
} from "@/lib/offline/docs/docs-listing-cache-key";
import { docsListingRowsTable, type OfflineDocsListingRow } from "@/lib/offline/docs/docs-schema";

export type DocsListingCacheSnapshot = {
  results: WgwUnifiedSearchResult[];
  hasMore: boolean;
  syncedAt: number;
};

function metaSyncedAtKey(cacheKey: string): string {
  return `docs:listing:${cacheKey}:syncedAt`;
}

function rowId(cacheKey: string, sourceKey: string): string {
  return `${cacheKey}::${sourceKey}`;
}

function serializeResult(result: WgwUnifiedSearchResult): string {
  return JSON.stringify(result);
}

function deserializeResult(payload: string): WgwUnifiedSearchResult {
  return JSON.parse(payload) as WgwUnifiedSearchResult;
}

export async function readDocsListingFromCache(
  username: string,
  filters: DocsListingBrowseFilters,
): Promise<DocsListingCacheSnapshot | null> {
  const cacheKey = docsListingCacheKey(filters);
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const rows = await docsListingRowsTable(db).where("cacheKey").equals(cacheKey).toArray();
  if (rows.length === 0) return null;

  const ordered = rows.sort((a, b) => a.sortIndex - b.sortIndex);
  const results = ordered.map((row) => deserializeResult(row.data));
  const syncedAtRaw = await readMeta(username, metaSyncedAtKey(cacheKey));
  const syncedAt = syncedAtRaw ? Number.parseInt(syncedAtRaw, 10) : 0;

  return {
    results: sortDocsHomeResults(results),
    hasMore: false,
    syncedAt: Number.isFinite(syncedAt) ? syncedAt : 0,
  };
}

export async function writeDocsListingToCache(
  username: string,
  filters: DocsListingBrowseFilters,
  snapshot: Pick<DocsListingCacheSnapshot, "results" | "hasMore">,
): Promise<void> {
  const cacheKey = docsListingCacheKey(filters);
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const table = docsListingRowsTable(db);
  const syncedAt = Date.now();
  const sorted = sortDocsHomeResults(snapshot.results);

  await table.where("cacheKey").equals(cacheKey).delete();
  const rows: OfflineDocsListingRow[] = sorted.map((result, sortIndex) => ({
    id: rowId(cacheKey, result.sourceKey),
    cacheKey,
    sourceKey: result.sourceKey,
    data: serializeResult(result),
    modifiedAt: result.modifiedAt ?? 0,
    sortIndex,
  }));
  if (rows.length > 0) {
    await table.bulkPut(rows);
  }
  await writeMeta(username, metaSyncedAtKey(cacheKey), String(syncedAt));
  rememberOfflineDocsUsername(username);
}
