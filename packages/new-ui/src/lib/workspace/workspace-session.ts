export type WorkspaceUser = {
  displayName: string;
  initials?: string;
  /** Primary account email (e.g. compose identity, signatures). */
  email?: string;
};

/**
 * Authenticated viewer context for chrome (footer, compose-as, message detail).
 * Shape matches what a `/session` or `/me` REST payload might return.
 */
export type WorkspaceSession = {
  user: WorkspaceUser;
  /** Shown after the sender address in message detail (default “me”). */
  viewerInboxLabel?: string;
};

export function workspaceUserInitials(user: WorkspaceUser): string {
  if (user.initials?.trim()) return user.initials.trim();
  const parts = user.displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
