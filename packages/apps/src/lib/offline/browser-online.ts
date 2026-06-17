/** Read the browser's current online flag (SSR-safe). */
export function readBrowserOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/** True when a fetch failed because the device/network is unreachable (not HTTP 4xx/5xx). */
export function isFetchNetworkError(error: unknown): boolean {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") return false;
    if (error.name === "NetworkError") return true;
  }
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network request failed") ||
      message.includes("load failed")
    );
  }
  return false;
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
