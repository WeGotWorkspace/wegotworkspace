const OFFLINE_CONTACTS_USER_KEY = "wgw.offline.contacts.username";

export function rememberOfflineContactsUsername(username: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFLINE_CONTACTS_USER_KEY, username);
  } catch {
    // ignore
  }
}

export function readOfflineContactsUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(OFFLINE_CONTACTS_USER_KEY);
  } catch {
    return null;
  }
}

/** Session username first, then the last cached contacts account from localStorage. */
export function resolveContactsOfflineUsername(sessionUsername: string | undefined): string | null {
  const fromSession = sessionUsername?.trim();
  if (fromSession) return fromSession;
  return readOfflineContactsUsername()?.trim() ?? null;
}
