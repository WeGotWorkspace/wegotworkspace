/**
 * Class names from `settings-workspace.css` for forms inside the settings shell.
 * Generic layout primitives live under `@/ui/*`; this file only wires them to that stylesheet.
 */
export const settingsWorkspaceFormLayout = {
  /** Row/label look comes from `.settings-workspace` + `field-label-row` (no extra classes). */
  displayField: {},
  textField: {
    itemClassName: "settings-workspace__form-field",
  },
  saveActionRow: "settings-workspace__form-actions",
} as const;
