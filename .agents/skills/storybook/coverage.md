# Story variant matrix

**Policy and tiers:** [offline-first.md](offline-first.md) (canonical). **Policy vs CI:** [.agents/POLICY.md](../../POLICY.md).

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

## New component checklist

1. Mock-tier story — [offline-first.md](offline-first.md) done-when
2. Fixtures / harness — [fixtures.md](fixtures.md)
3. Stub slice handlers / `operations` — [apps-ui/components.md](../apps-ui/components.md)
4. a11y panel — [a11y-testing.md](a11y-testing.md)
5. Hook/logic tests — [testing/ui-architecture.md](../testing/ui-architecture.md) (not every story in Vitest)
