import type { ViewMode } from "@/view-mode-toggle/src/view-mode-toggle";

export const DRIVE_VIEW_MODE_STORAGE_KEY = "wgw.ui.drive.viewMode";
export const DOCS_VIEW_MODE_STORAGE_KEY = "wgw.ui.docs.viewMode";

function hasWindowStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function parseViewMode(value: string | null, fallback: ViewMode): ViewMode {
  if (value === "grid" || value === "list") return value;
  return fallback;
}

export function readPersistedViewMode(storageKey: string, fallback: ViewMode): ViewMode {
  if (!hasWindowStorage()) return fallback;
  try {
    return parseViewMode(window.localStorage.getItem(storageKey), fallback);
  } catch {
    return fallback;
  }
}

export function writePersistedViewMode(storageKey: string, mode: ViewMode): void {
  if (!hasWindowStorage()) return;
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}
