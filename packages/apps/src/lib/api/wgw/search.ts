import { wgwFetch, wgwReadJson } from "@/lib/api/wgw/http";

export type WgwUnifiedSearchResult = {
  id: number;
  sourceType: "file" | "caldav" | "carddav" | string;
  sourceSubtype?: string | null;
  sourceKey: string;
  title: string;
  extension?: string | null;
  category?: string | null;
  contentType?: string | null;
  size: number;
  modifiedAt: number;
  snippet?: string | null;
  tokenScore?: number;
  metadata?: Record<string, unknown>;
};

export type WgwUnifiedSearchData = {
  query: string;
  limit: number;
  sources: string[];
  filters?: {
    categories?: string[];
    extensions?: string[];
    modified_from?: number | null;
    modified_to?: number | null;
  };
  results: WgwUnifiedSearchResult[];
};

type WgwUnifiedSearchResponse = {
  data: WgwUnifiedSearchData;
};

export type WgwUnifiedSearchParams = {
  q: string;
  limit?: number;
  sources?: string[];
  categories?: string[];
  extensions?: string[];
  modifiedFrom?: string | Date;
  modifiedTo?: string | Date;
  signal?: AbortSignal;
};

export async function fetchWgwUnifiedSearch(
  params: WgwUnifiedSearchParams,
): Promise<WgwUnifiedSearchData> {
  const query = params.q.trim();
  const qs = new URLSearchParams();
  qs.set("q", query);
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  for (const source of params.sources ?? []) qs.append("sources[]", source);
  for (const category of params.categories ?? []) qs.append("categories[]", category);
  for (const extension of params.extensions ?? []) qs.append("extensions[]", extension);
  if (params.modifiedFrom) {
    qs.set(
      "modified_from",
      params.modifiedFrom instanceof Date ? params.modifiedFrom.toISOString() : params.modifiedFrom,
    );
  }
  if (params.modifiedTo) {
    qs.set(
      "modified_to",
      params.modifiedTo instanceof Date ? params.modifiedTo.toISOString() : params.modifiedTo,
    );
  }

  const res = await wgwFetch(`/search/unified?${qs.toString()}`, {
    method: "GET",
    signal: params.signal,
  });
  if (!res.ok) throw new Error(`GET /search/unified failed (${res.status})`);
  const payload = (await wgwReadJson(res)) as WgwUnifiedSearchResponse;
  return payload.data;
}

export async function downloadWgwUnifiedSearchRecord(input: {
  sourceType: "caldav" | "carddav";
  sourceKey: string;
  signal?: AbortSignal;
}): Promise<void> {
  const qs = new URLSearchParams();
  qs.set("source_type", input.sourceType);
  qs.set("source_key", input.sourceKey);
  const res = await wgwFetch(`/records/download?${qs.toString()}`, {
    method: "GET",
    signal: input.signal,
  });
  if (!res.ok) throw new Error(`GET /records/download failed (${res.status})`);
  const blob = await res.blob();
  const fileName = filenameFromContentDisposition(res.headers.get("content-disposition"));
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName ?? fallbackDownloadName(input.sourceType, input.sourceKey);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const basicMatch = header.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] ?? null;
}

function fallbackDownloadName(sourceType: "caldav" | "carddav", sourceKey: string): string {
  const tail = sourceKey.split("|").pop() ?? sourceKey;
  if (tail.includes(".")) return tail;
  return `${tail}.${sourceType === "caldav" ? "ics" : "vcf"}`;
}
