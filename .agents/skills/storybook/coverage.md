# Story coverage

**Offline-first policy:** [offline-first.md](offline-first.md) — mock-tier required for 100% of exports; live-tier optional.

## Required stories

Every **exported** shared primitive, pane, workspace, and app shell must have **mock-tier** stories under `*/stories/*.stories.tsx`.

## Variant matrix

Cover meaningful states — not every combinatorial explosion:

| Dimension | Example variants |
|-----------|------------------|
| Variant / size | Button: primary, subtle, ghost × sm, md, lg |
| State | disabled, active, loading, empty, error |
| Data | populated vs empty collections |
| Interaction | form dirty, password filled (see settings profile stories) |

## autodocs

Global `tags: ["autodocs"]` in `.storybook/preview.ts`. Use `component` in `meta` so docs pages generate props tables.

## When adding a new component

1. Add mock-tier `stories/<name>.stories.tsx` — must work without live API.
2. Prefer `args` + `argTypes` for knob-driven primitives.
3. Use harness components + `@/lib/api/mock/*-bootstrap` for apps/panes ([fixtures.md](fixtures.md)).
4. Run Storybook a11y panel ([a11y-testing.md](a11y-testing.md)).
5. Stub **slice handlers** / mock **`operations`** ([apps-ui/components.md](../apps-ui/components.md)).
6. Add **`Live …`** story only if integration smoke is needed ([offline-first.md](offline-first.md)).

## Vitest vs Storybook

| Concern | Where |
|---------|--------|
| Visual states, manual UI exploration | Storybook mock-tier |
| Logic, parsers, hooks | Vitest ([testing/ui-architecture.md](../testing/ui-architecture.md)) |
| Critical UI interactions (automated) | Story `play` functions (target) on mock-tier stories |

Logic and contracts → Vitest. Layout and interaction exploration → Storybook offline.
