# Story coverage

## Required stories

Every **exported** shared primitive and significant pane should have at least one story file under `*/stories/*.stories.tsx`.

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

1. Add `stories/<name>.stories.tsx` alongside the feature module.
2. Prefer `args` + `argTypes` for knob-driven primitives.
3. Use harness components for panes needing providers (see [fixtures.md](fixtures.md)).
4. Run Storybook a11y panel on new stories ([a11y-testing.md](a11y-testing.md)).

## Vitest vs Storybook

Logic and contracts → Vitest ([testing/ui-architecture.md](../testing/ui-architecture.md)).
Visual and layout states → Storybook.
