import {
  readOfflineUsername,
  rememberOfflineUsername,
  resolveOfflineUsername,
} from "@/lib/offline/core/offline-account";

const CONTACTS_DOMAIN = "contacts";

/** Contacts-domain wrapper over the generic offline account session helpers. */
export function rememberOfflineContactsUsername(username: string): void {
  rememberOfflineUsername(CONTACTS_DOMAIN, username);
}

export function readOfflineContactsUsername(): string | null {
  return readOfflineUsername(CONTACTS_DOMAIN);
}

/** Session username first, then the last cached contacts account from localStorage. */
export function resolveContactsOfflineUsername(sessionUsername: string | undefined): string | null {
  return resolveOfflineUsername(CONTACTS_DOMAIN, sessionUsername);
}
