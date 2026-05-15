/**
 * Class names from `settings-workspace.css` for forms inside the settings shell.
 * Generic layout primitives live under `@/ui/*`; this file only wires them to that stylesheet.
 */
export const settingsWorkspaceFormLayout = {
  displayField: {
    className: "settings-workspace__form-field",
    labelClassName: "settings-workspace__form-label",
  },
  textField: {
    itemClassName: "settings-workspace__form-field",
    labelClassName: "settings-workspace__form-label",
  },
  saveActionRow: "settings-workspace__form-actions",
} as const;
