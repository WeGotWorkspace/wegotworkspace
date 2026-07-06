const OFFLINE_DEVICE_CONTENT_SETTINGS_KEY = "wgw.offline.deviceContentSettings";
const DEFAULT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export type OfflineDeviceContentSettings = {
  contentSyncEnabled: boolean;
  maxFileSizeBytes: number;
};

export const DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS: OfflineDeviceContentSettings = {
  contentSyncEnabled: true,
  maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
};

type SettingsListener = (settings: OfflineDeviceContentSettings) => void;

const listeners = new Set<SettingsListener>();

function normalizeSettings(
  partial: Partial<OfflineDeviceContentSettings> | null | undefined,
): OfflineDeviceContentSettings {
  const base = DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS;
  if (!partial) return { ...base };
  const maxFileSizeBytes =
    typeof partial.maxFileSizeBytes === "number" && partial.maxFileSizeBytes > 0
      ? Math.floor(partial.maxFileSizeBytes)
      : base.maxFileSizeBytes;
  return {
    contentSyncEnabled:
      typeof partial.contentSyncEnabled === "boolean"
        ? partial.contentSyncEnabled
        : base.contentSyncEnabled,
    maxFileSizeBytes,
  };
}

function notifyListeners(settings: OfflineDeviceContentSettings): void {
  for (const listener of listeners) {
    listener(settings);
  }
}

/** Read per-device offline content sync settings from localStorage. */
export function readOfflineDeviceContentSettings(): OfflineDeviceContentSettings {
  if (typeof window === "undefined") return { ...DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS };
  try {
    const raw = localStorage.getItem(OFFLINE_DEVICE_CONTENT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS };
    return normalizeSettings(JSON.parse(raw) as Partial<OfflineDeviceContentSettings>);
  } catch {
    return { ...DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS };
  }
}

/** Persist per-device offline content sync settings. */
export function writeOfflineDeviceContentSettings(
  next: Partial<OfflineDeviceContentSettings>,
): OfflineDeviceContentSettings {
  const merged = normalizeSettings({ ...readOfflineDeviceContentSettings(), ...next });
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(OFFLINE_DEVICE_CONTENT_SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      // Ignore quota / private mode failures.
    }
  }
  notifyListeners(merged);
  return merged;
}

/** Subscribe to settings changes (same-tab writes and cross-tab storage events). */
export function subscribeOfflineDeviceContentSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== OFFLINE_DEVICE_CONTENT_SETTINGS_KEY) return;
      listener(readOfflineDeviceContentSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

export function isEligibleForAutoContentSync(
  sizeBytes: number | null | undefined,
  settings: OfflineDeviceContentSettings = readOfflineDeviceContentSettings(),
): boolean {
  if (!settings.contentSyncEnabled) return false;
  if (typeof sizeBytes !== "number" || sizeBytes < 0) return true;
  return sizeBytes <= settings.maxFileSizeBytes;
}

export function maxOfflineFileSizeMb(settings = readOfflineDeviceContentSettings()): number {
  return Math.round((settings.maxFileSizeBytes / (1024 * 1024)) * 10) / 10;
}

export function mbToOfflineFileSizeBytes(mb: number): number {
  return Math.max(1, Math.floor(mb)) * 1024 * 1024;
}
