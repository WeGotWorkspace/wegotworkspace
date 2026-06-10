# Component design

Extends primitive API rules in [SKILL.md](SKILL.md). For *App / *Workspace splits see [workspace/feature-blueprint.md](../workspace/feature-blueprint.md).

## Layers

| Layer | Responsibility | Example |
|-------|----------------|---------|
| Primitive | Behavior + generic styling via CSS vars | `Button`, `Input`, `Card` |
| Composite | Composes primitives; still reusable | `FieldLabelRow`, `ViewHeader` |
| Pane | Product section; workspace-scoped CSS | `SettingsProfilePane` |
| Workspace | Layout shell + nav | `SettingsWorkspace` |
| App | Routing, API wiring, callbacks | `SettingsApp` |

## Props design

- **Behavior props** over presentation props: `variant`, `disabled`, `onClick` — not `toolbarStyle`.
- **Descriptor arrays** for actions: `{ id, label, icon, onClick, active }[]` — not ad-hoc dropdown JSX at callsites.
- **Callbacks upward** for shell-owned flows: `onLogout`, navigation — workspace must not call `window.location` ([workspace](../workspace/SKILL.md)).
- Optional props with sensible defaults; avoid required props that are always the same at every callsite.

## Composition

- Reuse `@/ui` and shared packages before inventing product-prefixed clones.
- Promote to `@/ui` only when **two or more products** need identical behavior.
- File-private story/pane helpers (`Sidebar`, `MainHeader`) are fine when they reduce noise without hiding reusable API.

## Styling split

- Structure/layout class names in TSX.
- Visual contract in co-located or workspace CSS files.
- Dynamic runtime values (percent widths, measured sizes) may stay inline in TSX.

## Accessibility

Semantic HTML and labels: [accessibility](../accessibility/SKILL.md).

## TypeScript

Exported prop types and conventions: [typescript.md](typescript.md).

## Stories

Every significant export needs catalog coverage: [storybook](../storybook/SKILL.md).
