---
name: storybook
description: Storybook standards for packages/apps — offline-first coverage, CSF3 stories, mock vs live tiers, argTypes knobs, cssprops, fixtures, and a11y. Use when creating or updating .stories.tsx files.
paths:
  - "packages/apps/**/*.stories.*"
  - "packages/apps/.storybook/**"
---

# Storybook

Config: `packages/apps/.storybook/main.ts`, `preview.ts`.

Addons in use: `@storybook/addon-a11y`, `@ljcl/storybook-addon-cssprops`, `@storybook/addon-docs`, `@chromatic-com/storybook`.

## Quick decision matrix

| Task | Read |
|------|------|
| Offline-first / mock vs live / 100% coverage | [offline-first.md](offline-first.md) (canonical) |
| Variant matrix / new export checklist | [coverage.md](coverage.md) |
| CSS variable knobs | [cssprops.md](cssprops.md) |
| Harnesses / fixtures / router | [fixtures.md](fixtures.md) |
| Accessibility testing | [a11y-testing.md](a11y-testing.md) → [accessibility](../accessibility/SKILL.md) |

## CSF3 baseline

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Component> = {
  title: "Shared/ComponentName",
  component: Component,
  argTypes: { /* knobs */ },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: { /* … */ },
};
```

Reference: `packages/apps/src/button/stories/button.stories.tsx`.

## Run

- Dev: `pnpm dev:ui` or `pnpm storybook` in monorepo root / `packages/apps`
- URL: http://127.0.0.1:6006

## Title namespaces

- `Shared/` — primitives and cross-app components
- `Apps/{Product}/…` — product-specific panes and apps

Keep titles stable; they are the catalog index.

**Policy vs CI:** [.agents/POLICY.md](../../POLICY.md). **Done verification:** [developer/done-checklist.md](../developer/done-checklist.md) (UI section).
