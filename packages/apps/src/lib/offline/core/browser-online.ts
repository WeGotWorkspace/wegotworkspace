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

let connectivityOnline = readBrowserOnline();

/** Snapshot for useSyncExternalStore; may reflect probe results when navigator.onLine is stale. */
export function getConnectivitySnapshot(): boolean {
  return connectivityOnline;
}

/**
 * Probe same-origin reachability. Catches DevTools "offline before navigation" where
 * `navigator.onLine` stays true until the offline event fires.
 */
export async function probeBrowserReachable(signal?: AbortSignal): Promise<boolean> {
  if (!readBrowserOnline()) {
    return false;
  }
  try {
    await fetch(new URL(import.meta.env.BASE_URL, window.location.origin), {
      method: "HEAD",
      cache: "no-store",
      signal,
    });
    return true;
  } catch (error) {
    return isFetchNetworkError(error) ? false : true;
  }
}

/** Subscribe to browser online/offline events. No-op outside the browser. */
export function subscribeBrowserOnline(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let probeController: AbortController | undefined;

  const setOnline = (online: boolean) => {
    if (connectivityOnline === online) return;
    connectivityOnline = online;
    onStoreChange();
  };

  const adoptNavigatorOffline = () => {
    if (!readBrowserOnline()) {
      setOnline(false);
    }
  };

  const scheduleReachabilityProbe = () => {
    probeController?.abort();
    if (!readBrowserOnline()) {
      return;
    }
    probeController = new AbortController();
    const { signal } = probeController;
    void probeBrowserReachable(signal).then((reachable) => {
      if (signal.aborted) return;
      if (!reachable) {
        setOnline(false);
        return;
      }
      if (readBrowserOnline()) {
        setOnline(true);
      }
    });
  };

  const onOnline = () => {
    probeController?.abort();
    setOnline(true);
  };
  const onOffline = () => {
    probeController?.abort();
    setOnline(false);
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  connectivityOnline = readBrowserOnline();
  onStoreChange();
  const deferredId = window.setTimeout(adoptNavigatorOffline, 0);
  scheduleReachabilityProbe();

  return () => {
    probeController?.abort();
    window.clearTimeout(deferredId);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
