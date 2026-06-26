import type { PathBreadcrumbItem } from "@/path-breadcrumb/src/path-breadcrumb";
import type { WgwDriveDirectoryEntry } from "@/lib/api/wgw/types";
import type { DriveFile, FileKind } from "@/drive-core/src/drive-models";
import { formatBytesCompact, inferFileKindFromName } from "@/drive-core/src/drive-file-utils";

/** Normalize a share-relative path: no leading/trailing slashes, collapsed separators. */
export function normalizeSharePath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/");
}

/** Join a parent relative path with a child name. */
export function joinSharePath(parent: string, name: string): string {
  const base = normalizeSharePath(parent);
  return base === "" ? name : `${base}/${name}`;
}

/** Build a {@link DriveFile} for a single-file share from its public metadata. */
export function shareFileFromName(name: string): DriveFile {
  const kind: FileKind = inferFileKindFromName(name);
  return {
    id: name,
    notebook: "File",
    category: "File",
    date: "",
    title: name,
    excerpt: name,
    body: [],
    tags: [],
    wordCount: 0,
    parent: "",
    kind,
    size: "—",
    // Single-file shares ignore the relative path for content requests.
    apiPath: "",
  };
}

/** Map a directory entry (path relative to the share root) into a {@link DriveFile}. */
export function shareFileFromEntry(entry: WgwDriveDirectoryEntry): DriveFile {
  const relPath = normalizeSharePath(entry.path);
  const kind: FileKind = entry.type === "dir" ? "folder" : inferFileKindFromName(entry.name);
  const date = entry.time > 0 ? new Date(entry.time * 1000).toLocaleDateString() : "Now";
  const size = entry.type === "dir" ? "—" : formatBytesCompact(entry.size);
  return {
    id: relPath || entry.name,
    notebook: entry.type === "dir" ? "Folder" : `File · ${size}`,
    category: entry.type === "dir" ? "Folder" : "File",
    date,
    title: entry.name,
    excerpt: relPath,
    body: [],
    tags: [],
    wordCount: 0,
    parent: "",
    kind,
    size,
    apiPath: relPath,
  };
}

/**
 * Build breadcrumb items for the current share-relative path. The root crumb uses
 * {@link rootLabel} and an empty path; deeper crumbs navigate to their relative path.
 */
export function shareBreadcrumbs(rootLabel: string, relPath: string): PathBreadcrumbItem[] {
  const items: PathBreadcrumbItem[] = [{ label: rootLabel, path: "" }];
  const segments = normalizeSharePath(relPath).split("/").filter(Boolean);
  let accumulated = "";
  for (const segment of segments) {
    accumulated = accumulated === "" ? segment : `${accumulated}/${segment}`;
    items.push({ label: segment, path: accumulated });
  }
  return items;
}
