import type { FileKind } from "@/lib/files";
import { notifyDriveLocalStorage } from "@/lib/driveStorageNotify";

const STORAGE_KEY = "sabre-drive-recent";

const MAX_ENTRIES = 50;

export interface DriveRecentEntry {
  path: string;
  name: string;
  kind: FileKind;
  /** Unix timestamp (ms) when the item was opened */
  openedAt: number;
}

function parseStored(raw: string | null): DriveRecentEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: DriveRecentEntry[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      if (typeof o.path !== "string" || typeof o.name !== "string" || typeof o.kind !== "string") continue;
      const openedAt = typeof o.openedAt === "number" ? o.openedAt : Number(o.openedAt);
      if (!Number.isFinite(openedAt)) continue;
      out.push({
        path: o.path,
        name: o.name,
        kind: o.kind as FileKind,
        openedAt,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Newest-first list of recently opened paths. */
export function getDriveRecent(): DriveRecentEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Remember an open / double-click; moves entry to front and caps list size. */
export function recordDriveRecent(entry: { path: string; name: string; kind: FileKind }): void {
  if (typeof localStorage === "undefined") return;
  try {
    const prev = getDriveRecent();
    const next: DriveRecentEntry[] = [
      { ...entry, openedAt: Date.now() },
      ...prev.filter((e) => e.path !== entry.path),
    ].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notifyDriveLocalStorage();
  } catch {
    /* quota / private mode */
  }
}

/** After a server delete: drop this path and, for folders, recent entries under it. */
export function purgeDriveRecentAfterDelete(path: string, isFolder: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    const prev = getDriveRecent();
    if (!isFolder) {
      const next = prev.filter((e) => e.path !== path);
      if (next.length === prev.length) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      notifyDriveLocalStorage();
      return;
    }
    const base = path.replace(/\/+$/, "") || "/";
    const under = base === "/" ? "" : `${base}/`;
    const next = prev.filter((e) => {
      const p = e.path.replace(/\/+$/, "") || "/";
      if (p === base) return false;
      if (!under) return true;
      return !e.path.startsWith(under);
    });
    if (next.length === prev.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notifyDriveLocalStorage();
  } catch {
    /* quota / private mode */
  }
}
