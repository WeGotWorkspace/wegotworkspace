/** Workspace product ids that have branded launcher / PWA icons under `/app-icons/` and `/pwa-icons/`. */
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

/**
 * Future app icons stored under `/app-icons/` but not wired in the home grid or switcher yet.
 * Source artwork: calendar, reminders, tasks (vector SVG in `src/assets/app-icons/`).
 */
export const WORKSPACE_FUTURE_APP_ICON_IDS = ["calendar", "reminders", "tasks"] as const;

/** Sampled from icon artwork — keep in sync with webmanifest theme colors. */
export const WORKSPACE_APP_ACCENT: Record<WorkspaceAppId, string> = {
  notes: "#f0b422",
  mail: "#ef4444",
  contacts: "#7360c8",
  drive: "#10b981",
  docs: "#3b82f6",
  settings: "#64748b",
  meet: "#06b6d4",
  admin: "#475569",
};

const PWA_ICON_SIZE = 192;

/** Canonical user vector artwork for UI — real SVG paths in `/app-icons/`. */
export function workspaceAppIconUiSrc(appId: WorkspaceAppId): string {
  return `/app-icons/${appId}.svg`;
}

/** White glyph vector mask for switch-trigger inversion. */
export function workspaceAppIconGlyphMaskSrc(appId: WorkspaceAppId): string {
  return `/app-icons/${appId}-glyph.svg`;
}

/** CSS vars for the inverted switch trigger glyph mask (colors derive from workspace chrome tokens). */
export function workspaceAppIconSwitchTriggerStyle(
  appId: WorkspaceAppId,
): Record<`--${string}`, string> {
  return {
    "--workspace-app-icon-glyph-mask": `url(${workspaceAppIconGlyphMaskSrc(appId)})`,
  };
}

/** Rasterized PWA / install icons only — generated from vector SVG via `generate-pwa-icons.mjs`. */
export function workspaceAppIconSrc(appId: WorkspaceAppId, size = PWA_ICON_SIZE): string {
  return `/pwa-icons/${appId}-${size}.png`;
}

export function isWorkspaceAppId(value: string): value is WorkspaceAppId {
  return (WORKSPACE_APP_IDS as readonly string[]).includes(value);
}
