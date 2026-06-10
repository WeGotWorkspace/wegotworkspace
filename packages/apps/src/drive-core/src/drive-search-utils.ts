import type { DriveFile, FileKind } from "@/drive-core/src/drive-models";
import type { DriveUnifiedSearchResult } from "@/drive-core/src/drive-types";
import { uiPathFromApiPath } from "@/drive-core/src/drive-path-utils";

export function parentVirtualPath(path: string): string {
  const normalized = path.trim().replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "My Drive";
  return normalized.slice(0, idx);
}

export function apiPathFromSearchSourceKey(sourceKey: string): string | null {
  const key = sourceKey.trim().replace(/^\/+/, "");
  if (!key) return null;
  return `/${key}`;
}

function fileKindFromCategory(category: string | null | undefined): FileKind {
  if (category === "folder") return "folder";
  if (category === "image") return "image";
  if (category === "audio") return "audio";
  if (category === "video") return "video";
  if (category === "archive") return "archive";
  if (category === "document" || category === "spreadsheet" || category === "presentation") {
    return "doc";
  }
  if (category === "doc") return "doc";
  return "file";
}

export function driveFileFromSearchResult(
  result: DriveUnifiedSearchResult,
  uiPath: string,
  apiPath: string,
): DriveFile {
  const title = result.title || uiPath.split("/").pop() || result.sourceKey;
  const parent = parentVirtualPath(uiPath);
  const kind = fileKindFromCategory(result.category);

  return {
    id: `search:${result.sourceType}:${result.sourceKey}`,
    category: result.category ?? "File",
    date: "",
    title,
    excerpt: result.snippet ?? "",
    body: [],
    notebook: "",
    tags: [],
    wordCount: 0,
    parent,
    kind,
    size: result.size > 0 ? String(result.size) : "—",
    apiPath: apiPath || undefined,
  };
}

export function uiPathForSearchResult(
  result: DriveUnifiedSearchResult,
  username: string,
): string | null {
  const apiPath = apiPathFromSearchSourceKey(result.sourceKey);
  if (!apiPath) return null;
  return uiPathFromApiPath(apiPath, username);
}
