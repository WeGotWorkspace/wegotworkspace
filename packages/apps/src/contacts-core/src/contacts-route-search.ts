/**
 * Path-based contacts routing utilities.
 *
 * URL structure:
 *   /contacts/all
 *   /contacts/all/:contactId
 *   /contacts/groups/:groupCardId
 *   /contacts/groups/:groupCardId/:contactId
 */

/**
 * Derive the controller `view` string from path params.
 * Returns `"group:{groupCardId}"` when a group segment is present, `"all"` otherwise.
 */
export function contactsViewFromParams(params: { groupCardId?: string }): string {
  return params.groupCardId ? `group:${params.groupCardId}` : "all";
}

/** Active contact card id from path params; empty string when absent. */
export function contactsContactFromParams(params: { contactId?: string }): string {
  return params.contactId ?? "";
}
