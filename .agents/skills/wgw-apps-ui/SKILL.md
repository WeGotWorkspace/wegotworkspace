---
name: wgw-apps-ui
description: UI architecture for packages/apps — primitive API boundaries, parent-scoped CSS variables, workspace pane styling, and responsive action surfaces. Use when building or refactoring UI in packages/apps.
paths:
  - "packages/apps/src/**/*.ts"
  - "packages/apps/src/**/*.tsx"
  - "packages/apps/src/**/*.css"
---

# WeGotWorkspace Apps UI

When building or refactoring UI in `packages/apps/src/**/*.{ts,tsx,css}`:

## Primitive API boundaries

For shared primitives (`Button`, `IconButton`, and similar):

- Expose behavior/state props (`variant`, `size`, `active`, `disabled`) but avoid context props like `context="toolbar"`.
- Do not require parent components to pass inline style objects for recurring visual contexts.
- Use class names for structure/layout only; use CSS variables for theme/context values.
- Internal icon sizing and state-dependent fill/stroke belong to the primitive, not callsites.
- Prefer introducing new CSS variables over adding one-off variant branches in TypeScript.
- For responsive action surfaces, prefer descriptor props (`*Actions`) over arbitrary node slots in new APIs.

Refactor checklist:

- Move duplicated `style={...}` presets into parent-scoped CSS variables.
- Remove unused preset helper files after migration.
- Verify callsites no longer hardcode icon sizing/fill when primitive already owns it.
- Keep legacy slot props only as compatibility paths; avoid new usage when descriptor APIs exist.

## Parent-scoped CSS variables and workspace styling

### Primitives and tokens

- Primitives MUST stay context-agnostic; do not put semantic context classes like `*-toolbar`, `*-list`, `*-fab` on primitive instances.
- Parent containers MUST own visual context by setting CSS custom properties in parent CSS files (for example `.settings-workspace`, `.admin-workspace`, `.admin-dialog-surface`).
- Primitives MUST consume variables with defaults, e.g. `var(--button-subtle-color, <fallback>)`.
- State behavior (hover, active, disabled) MUST live in primitive CSS; parents MUST override via variables only, not by reimplementing state in TSX.
- Styling contracts MUST live in CSS files; do NOT centralize recurring visual presets in TypeScript objects.
- When layout depends on parent width, you MUST use container queries in shared CSS with a media-query fallback where needed.
- For SVG marks, logos, and accents: co-locate a `*.css` next to the component, expose tokens such as `--*-fill` (and optional `--*-height` / offset), and use a short fallback chain (app tokens then `currentColor`) instead of presentation props like `fill={...}` on the React surface.

Example:

- Parent CSS: set `--button-subtle-*`, `--button-ghost-*`, `--button-primary-*` on the workspace or dialog root.
- Primitive CSS: read those vars in `.button--variant-*` rules with sensible fallbacks.

### Tailwind and `className` in workspace panes

- Repeated pane layout, typography, list chrome, tables, and tone MUST NOT be expressed as long duplicated Tailwind utility stacks or ad hoc `style={{ color: ... }}` in TSX.
- Those concerns MUST live in the workspace stylesheet (for example `settings-workspace.css` under `.settings-workspace`, or `admin-panes.css` included from `admin-workspace.css` and scoped with `:is(.admin-workspace, .admin-dialog-surface)` where portaled surfaces need the same tokens).
- Pane TSX MUST use semantic class names tied to that stylesheet for those contracts.
- TSX MAY keep Tailwind only for true one-offs or layout that is not part of a repeated visual contract; anything copied across rows/cards/sections MUST move to CSS.

Dynamic values that depend on runtime data (for example `style={{ width: \`${percent}%\` }}`) MUST stay in TSX.

## Responsive action surfaces

When a component must switch between inline actions and overflow menus:

- Prefer structured action descriptors (for example `{ id, label, icon, onClick, active }[]`) over arbitrary `ReactNode` slots.
- Keep the adaptive behavior inside the shared component (row vs dropdown), not duplicated in each consumer.
- Use container query behavior first and provide a media-query fallback for reliability.
- Expose optional trigger override props (for example `leftMenuIcon` / `rightMenuIcon`) so products can keep context-specific affordances.
- Keep legacy slot props only for compatibility; avoid introducing them in new callsites.

Implementation checklist:

- Shared component owns dropdown trigger rendering and menu item mapping.
- Consumer components pass action descriptors and labels, not ad-hoc dropdown trees.
- Dropdown item icon sizing is normalized by shared CSS.
