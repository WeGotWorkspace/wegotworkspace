---
name: accessibility
description: WCAG 2.x accessibility guardrails for packages/apps UI — keyboard, semantics, forms, contrast, and motion. Use when building components, reviewing UI, or fixing a11y violations.
paths:
  - "packages/apps/src/**/*.tsx"
  - "packages/apps/src/**/*.ts"
  - "packages/apps/src/**/*.css"
---

# Accessibility

**Target:** WCAG 2.2 Level **AA** by default. Checklist: [wcag.md](wcag.md).

Storybook verification: [storybook/a11y-testing.md](../storybook/a11y-testing.md).

## Keyboard

- All interactive controls reachable and operable via keyboard.
- Visible focus indicator; logical tab order.
- No keyboard traps in dialogs/menus without escape path.
- Do not rely on hover-only affordances for essential actions.

## Semantics

- Prefer native elements (`button`, `a`, `input`, `label`) over div-onClick.
- Landmarks and headings reflect page structure.
- Add `aria-*` only when HTML alone is insufficient.
- Icon-only buttons require accessible name (`aria-label` or visually hidden text).

## Forms

- Every input has an associated label (`FieldLabelRow`, `<label htmlFor>`, or `aria-labelledby`).
- Errors linked to fields; announced on submit failure where appropriate.
- Required state exposed to assistive tech.

## Color and contrast

- Do not convey information by color alone.
- Text and control contrast meet AA minimums (4.5:1 normal text; 3:1 large text / UI components).
- Workspace tokens must preserve readable defaults — test in Storybook a11y panel.

## Motion

- Respect `prefers-reduced-motion` for non-essential animation.
- Avoid flashing content in violation of seizure thresholds.

## Dynamic content

- Dialogs: focus trap + restore focus on close.
- Toasts: use live regions appropriately; do not steal focus for non-critical messages.
- Route changes: manage focus when main content swaps (app shell responsibility).

## Integration

- Primitive styling: [apps-ui](../apps-ui/SKILL.md) — semantics here, visuals there.
- Storybook axe checks: [storybook/a11y-testing.md](../storybook/a11y-testing.md).
