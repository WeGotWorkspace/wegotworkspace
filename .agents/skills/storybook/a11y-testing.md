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

When the team adopts CI enforcement, switch preview `test` to `error` for merged stories — coordinate with maintainers before changing global default.

## Limits

Storybook a11y does not replace keyboard testing in the real app shell or API error-message accessibility.
