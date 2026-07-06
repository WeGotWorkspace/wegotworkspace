export type DriveViewMode = "grid" | "list";

export function parseDriveViewMode(value: string | null, fallback: DriveViewMode): DriveViewMode {
  if (value === "grid" || value === "list") return value;
  return fallback;
}

export function readDriveViewMode(storageKey: string, fallback: DriveViewMode): DriveViewMode {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return fallback;
  }
  try {
    return parseDriveViewMode(window.localStorage.getItem(storageKey), fallback);
  } catch {
    return fallback;
  }
}

export function writeDriveViewMode(storageKey: string, mode: DriveViewMode): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore storage failures.
  }
}
