/**
 * Persists confirmed-email share access tokens in `sessionStorage`, keyed by link token.
 * The access token is returned only by `POST /shares/grants/confirm` and is sent on
 * subsequent requests via the `X-Wgw-Share-Access` header.
 */
const KEY_PREFIX = "wgw.share.access.";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getShareAccessToken(token: string): string | null {
  const store = storage();
  if (!store) return null;
  try {
    return store.getItem(`${KEY_PREFIX}${token}`);
  } catch {
    return null;
  }
}

export function setShareAccessToken(token: string, accessToken: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(`${KEY_PREFIX}${token}`, accessToken);
  } catch {
    // Ignore storage failures; access stays in-memory for the current session only.
  }
}

export function clearShareAccessToken(token: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(`${KEY_PREFIX}${token}`);
  } catch {
    // Ignore storage failures.
  }
}
