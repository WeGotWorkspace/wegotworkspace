/**
 * Extension integration - fetch files via the browser extension's proxy.html iframe
 *
 * Requests are multiplexed by ID to support concurrent fetches.
 * Supports file:// URLs and cross-origin http(s) URLs.
 */

// Set to the actual Chrome Web Store URL once the extension is published.
// When empty, all extension install prompts are hidden.
export const EXTENSION_STORE_URL = "https://chromewebstore.google.com/detail/office-editor-for-docs-sh/kjigcolnmdghbjgkcijcdahaobhkpngo";

/**
 * Get the extension ID from the meta tag injected by the content script.
 */
export function getExtensionId(): string | null {
  return (
    document.querySelector<HTMLMetaElement>('meta[name="office-ext-id"]')
      ?.content || null
  );
}

/**
 * Check if the browser extension is available.
 */
export function isExtensionAvailable(): boolean {
  return getExtensionId() !== null;
}

/**
 * Create a loader for server.openUrl() that fetches via the extension proxy.
 * If extension is not installed, waits for it to become available.
 *
 * Returns:
 * - loader: (url) => Promise<ArrayBuffer> — pass to server.openUrl()
 * - tryDirect: () => Promise<void> — call from UI to attempt native fetch
 */
export function createExtensionLoader(options: {
  onWaiting?: () => void;
  onReady?: () => void;
  signal?: AbortSignal;
} = {}) {
  const { onWaiting, onReady, signal } = options;

  let pendingUrl: string | null = null;
  let resolvePending: ((buf: ArrayBuffer) => void) | null = null;

  const loader = async (url: string): Promise<ArrayBuffer> => {
    if (isExtensionAvailable()) {
      const resp = await extensionFetch(url, { signal });
      return resp.arrayBuffer();
    }

    // Extension not available — wait for install
    pendingUrl = url;
    onWaiting?.();

    return new Promise<ArrayBuffer>((resolve, reject) => {
      resolvePending = (buf) => {
        resolvePending = null;
        resolve(buf);
      };

      waitForExtension(signal)
        .then(async () => {
          onReady?.();
          if (!resolvePending) return; // already resolved by tryDirect
          const resp = await extensionFetch(url, { signal });
          resolvePending(await resp.arrayBuffer());
        })
        .catch(reject);
    });
  };

  /**
   * Try native fetch (no extension). Resolves the pending loader if successful.
   * Throws on failure (CORS, file://, network error).
   */
  const tryDirect = async (): Promise<void> => {
    if (!pendingUrl) throw new Error("No pending request");
    if (pendingUrl.startsWith("file://")) {
      throw new Error("Cannot open local files without the extension");
    }
    const resp = await fetch(pendingUrl, { signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();
    resolvePending?.(buf);
  };

  return { loader, tryDirect };
}

function waitForExtension(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isExtensionAvailable()) {
      resolve();
      return;
    }

    // Content script won't inject into already-open pages after install.
    // Poll with reload hint — the onWaiting callback should prompt
    // the user to install, which will suggest a page reload.
    const interval = setInterval(() => {
      if (isExtensionAvailable()) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);

    signal?.addEventListener("abort", () => {
      clearInterval(interval);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    }, { once: true });
  });
}

let idCounter = 0;

/**
 * Fetch a URL via the extension's proxy iframe.
 * API compatible with the standard fetch(), returns a Response object.
 * Supports file:// URLs and cross-origin http(s) URLs.
 */
export function extensionFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  const signal = init?.signal;
  const extId = getExtensionId();

  if (!extId) {
    return Promise.reject(
      new TypeError("Office extension is not installed"),
    );
  }

  const id = String(++idCounter);

  return new Promise<Response>((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.style.display = "none";
    iframe.src = `chrome-extension://${extId}/proxy.html`;

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      signal?.removeEventListener("abort", onAbort);
      setTimeout(() => iframe.remove(), 100);
    };

    const onAbort = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new DOMException("The operation was aborted.", "AbortError"));
      }
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const { type } = e.data ?? {};

      if (type === "ready") {
        iframe.contentWindow?.postMessage({ type: "fetch", id, url }, "*");
        return;
      }

      if (e.data?.id !== id) return;

      if (type === "response" && !settled) {
        settled = true;
        cleanup();
        resolve(
          new Response(e.data.buffer as ArrayBuffer, {
            status: e.data.status ?? 200,
            statusText: e.data.statusText ?? "OK",
            headers: e.data.headers ?? {},
          }),
        );
      } else if (type === "error" && !settled) {
        settled = true;
        cleanup();
        reject(new TypeError(e.data.error || "Extension fetch failed"));
      }
    };

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}
