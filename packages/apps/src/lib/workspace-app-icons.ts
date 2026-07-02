/** Workspace product ids that have branded launcher / PWA icons under `/pwa-icons/`. */
export const WORKSPACE_APP_IDS = [
  "notes",
  "mail",
  "contacts",
  "drive",
  "docs",
  "settings",
  "meet",
  "admin",
] as const;

export type WorkspaceAppId = (typeof WORKSPACE_APP_IDS)[number];

/** Sampled from icon PNG border pixels — keep in sync with webmanifest theme colors. */
export const WORKSPACE_APP_ACCENT: Record<WorkspaceAppId, string> = {
  notes: "#f59e0b",
  mail: "#ef4444",
  contacts: "#8b5cf6",
  drive: "#10b981",
  docs: "#3b82f6",
  settings: "#64748b",
  meet: "#06b6d4",
  admin: "#475569",
};

const PWA_ICON_SIZE = 192;

export function workspaceAppIconSrc(appId: WorkspaceAppId, size = PWA_ICON_SIZE): string {
  return `/pwa-icons/${appId}-${size}.png`;
}

export function isWorkspaceAppId(value: string): value is WorkspaceAppId {
  return (WORKSPACE_APP_IDS as readonly string[]).includes(value);
}
