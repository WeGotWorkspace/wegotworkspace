import {
  readOfflineUsername,
  rememberOfflineUsername,
  resolveOfflineUsername,
} from "@/lib/offline/core/offline-account";

const CONTACTS_DOMAIN = "contacts";
const DOCS_DOMAIN = "docs";
const NOTES_DOMAIN = "notes";

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

/** Docs-domain wrapper over the generic offline account session helpers. */
export function rememberOfflineDocsUsername(username: string): void {
  rememberOfflineUsername(DOCS_DOMAIN, username);
}

export function readOfflineDocsUsername(): string | null {
  return readOfflineUsername(DOCS_DOMAIN);
}

/** Session username first, then the last cached docs account from localStorage. */
export function resolveDocsOfflineUsername(sessionUsername: string | undefined): string | null {
  return resolveOfflineUsername(DOCS_DOMAIN, sessionUsername);
}

/** Notes-domain wrapper over the generic offline account session helpers. */
export function rememberOfflineNotesUsername(username: string): void {
  rememberOfflineUsername(NOTES_DOMAIN, username);
}

export function readOfflineNotesUsername(): string | null {
  return readOfflineUsername(NOTES_DOMAIN);
}

/** Session username first, then the last cached notes account from localStorage. */
export function resolveNotesOfflineUsername(sessionUsername: string | undefined): string | null {
  return resolveOfflineUsername(NOTES_DOMAIN, sessionUsername);
}
