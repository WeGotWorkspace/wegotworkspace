export const TRANSIENT_DOC_STATUS_DISMISS_MS = 4000;

export const DOC_STATUS_LOADED_SHARED_DOCUMENT = "Loaded shared document";
export const DOC_STATUS_RESTORED_WORKING_VERSION = "Restored working version";
export const DOC_STATUS_SAVED_PREFIX = "Saved · ";

export function formatSavedDocStatus(date: Date = new Date()): string {
  return `${DOC_STATUS_SAVED_PREFIX}${date.toLocaleTimeString()}`;
}

const TRANSIENT_DOC_STATUS_MESSAGES = new Set<string>([
  DOC_STATUS_LOADED_SHARED_DOCUMENT,
  DOC_STATUS_RESTORED_WORKING_VERSION,
]);

/**
 * Transient statuses are one-off confirmations safe to auto-dismiss. Everything
 * else (connection/sync state, errors) is persistent and must stay until the
 * state itself changes.
 */
export function isTransientDocStatus(status: string): boolean {
  if (!status) return false;
  if (TRANSIENT_DOC_STATUS_MESSAGES.has(status)) return true;
  return status.startsWith(DOC_STATUS_SAVED_PREFIX);
}
