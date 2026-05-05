/** Same-tab updates (storage event only fires for other tabs). */
export const DRIVE_STORAGE_EVENT = "sabre-drive-local-storage";

export function notifyDriveLocalStorage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DRIVE_STORAGE_EVENT));
}

export function subscribeDriveLocalStorage(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key == null || e.key.startsWith("sabre-drive-")) cb();
  };
  const onCustom = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(DRIVE_STORAGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DRIVE_STORAGE_EVENT, onCustom);
  };
}
