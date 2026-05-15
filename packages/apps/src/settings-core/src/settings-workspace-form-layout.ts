/**
 * Class names from `settings-workspace.css` for forms inside the settings shell.
 * Generic layout primitives live under `@/ui/*`; these strings are scoped by `.settings-workspace`.
 */
export const settingsWorkspaceFormLayout = {
  /** Row/label look comes from `.settings-workspace` + `field-label-row` (no extra classes). */
  displayField: {},
  textField: {
    itemClassName: "settings-form-field",
  },
  saveActionRow: "settings-form-actions",
  grid2: "settings-grid-2",
} as const;
