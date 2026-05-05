import type { FileKind } from "@/lib/files";
import { notifyDriveLocalStorage } from "@/lib/driveStorageNotify";

const STORAGE_KEY = "sabre-drive-starred";

const MAX_ENTRIES = 200;

export interface DriveStarredEntry {
  path: string;
  name: string;
  kind: FileKind;
}

function parseStored(raw: string | null): DriveStarredEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: DriveStarredEntry[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      if (typeof o.path !== "string" || typeof o.name !== "string" || typeof o.kind !== "string") continue;
      out.push({ path: o.path, name: o.name, kind: o.kind as FileKind });
    }
    return out;
  } catch {
    return [];
  }
}

export function getDriveStarred(): DriveStarredEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function isDrivePathStarred(path: string): boolean {
  return getDriveStarred().some((e) => e.path === path);
}

function persist(entries: DriveStarredEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    notifyDriveLocalStorage();
  } catch {
    /* quota / private mode */
  }
}

/** Adds or updates starred metadata for a path (newest-first). */
export function addDriveStarred(entry: DriveStarredEntry): void {
  const prev = getDriveStarred();
  const next = [entry, ...prev.filter((e) => e.path !== entry.path)];
  persist(next);
}

export function removeDriveStarred(path: string): void {
  persist(getDriveStarred().filter((e) => e.path !== path));
}

/** After a server delete: drop this path and, for folders, any starred paths under it. */
export function purgeDriveStarredAfterDelete(path: string, isFolder: boolean): void {
  const prev = getDriveStarred();
  if (!isFolder) {
    persist(prev.filter((e) => e.path !== path));
    return;
  }
  const base = path.replace(/\/+$/, "") || "/";
  const under = base === "/" ? "" : `${base}/`;
  persist(
    prev.filter((e) => {
      const p = e.path.replace(/\/+$/, "") || "/";
      if (p === base) return false;
      if (!under) return true;
      return !e.path.startsWith(under);
    }),
  );
}

/** Returns true if the path is starred after the toggle. */
export function toggleDriveStarred(entry: DriveStarredEntry): boolean {
  if (isDrivePathStarred(entry.path)) {
    removeDriveStarred(entry.path);
    return false;
  }
  addDriveStarred(entry);
  return true;
}
