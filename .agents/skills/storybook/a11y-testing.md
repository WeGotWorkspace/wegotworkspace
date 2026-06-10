# Storybook a11y testing

Addon: `@storybook/addon-a11y` (axe-core).

## Configuration

`.storybook/preview.ts`:

```ts
a11y: {
  test: "todo", // violations shown in UI only
},
```

| Value | Behavior |
|-------|----------|
| `todo` | Show violations in Storybook UI (current default) |
| `error` | Fail CI / test run on violations |
| `off` | Skip checks |

## When developing stories

1. Open the **Accessibility** panel for each new/changed story.
2. Fix violations using [accessibility](../accessibility/SKILL.md) rules.
3. Prefer semantic HTML + labels before adding `aria-*`.

## WCAG depth

Perceivable, operable, understandable, robust criteria: [accessibility/wcag.md](../accessibility/wcag.md).

## CI escalation

Opt-in CI gate: set `STORYBOOK_A11Y_GATE=1` when running Storybook Vitest (see `packages/apps/vitest.config.ts` `define`) to switch `.storybook/preview.ts` a11y `test` to **`error`**. Local Storybook dev stays on `todo`. Enable in CI after `vitest-ci` stories are violation-free.

## Limits

Storybook a11y does not replace keyboard testing in the real app shell or API error-message accessibility.
