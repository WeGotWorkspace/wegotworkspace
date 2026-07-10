import { readBrowserOnline } from "@/lib/offline/core/browser-online";
import { isAccessTokenExpired, wgwEnsureFreshAccessToken } from "@/lib/api/wgw/http";

const DEBOUNCE_MS = 30_000;
const INTERVAL_MS = 5 * 60 * 1_000;
const INTERVAL_MARGIN_SEC = 10 * 60;

let activeCleanup: (() => void) | null = null;

function shouldSkipBecauseOffline(): boolean {
  return !readBrowserOnline();
}

export function startWgwSessionKeeper(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  activeCleanup?.();

  let lastDebouncedRunAt = 0;
  let stopped = false;

  const runRefresh = async () => {
    if (stopped || shouldSkipBecauseOffline()) return;
    try {
      await wgwEnsureFreshAccessToken();
    } catch {
      // Retry paths and auth redirects are handled by callers.
    }
  };

  const runDebouncedRefresh = () => {
    const now = Date.now();
    if (now - lastDebouncedRunAt < DEBOUNCE_MS) return;
    lastDebouncedRunAt = now;
    void runRefresh();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    runDebouncedRefresh();
  };

  const onFocus = () => {
    runDebouncedRefresh();
  };

  const onOnline = () => {
    // Never debounce online-triggered refresh; reconnect flush awaits this in-flight refresh.
    void runRefresh();
  };

  const intervalId = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (!isAccessTokenExpired(INTERVAL_MARGIN_SEC)) return;
    runDebouncedRefresh();
  }, INTERVAL_MS);

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);

  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
  };

  activeCleanup = cleanup;
  return cleanup;
}

export function stopWgwSessionKeeperForTests(): void {
  activeCleanup?.();
  activeCleanup = null;
}
