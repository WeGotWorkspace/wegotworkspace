/** Read the browser's current online flag (SSR-safe). */
export function readBrowserOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/** Subscribe to browser online/offline events. No-op outside the browser. */
export function subscribeBrowserOnline(onChange: (online: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onOnline = () => onChange(true);
  const onOffline = () => onChange(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
