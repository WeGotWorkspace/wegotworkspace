---
name: testing
description: Testing workflow for the WeGotWorkspace monorepo — test-first order, API PHPUnit, apps Vitest, e2e, done-gate, and done-when checklists. Use when writing, running, or reviewing tests.
paths:
  - "packages/api/tests/**"
  - "packages/apps/**/*.test.ts"
  - "packages/apps/**/*.test.tsx"
  - "**/*e2e*"
---

# Testing

## Quick decision matrix

| Task | Read |
|------|------|
| Test-first / red-green order | [test-first.md](test-first.md) |
| API / PHPUnit / done gate | [api/testing.md](../api/testing.md) |
| UI unit tests / Vitest | [ui-architecture.md](ui-architecture.md) |
| Storybook visual states | [storybook](../storybook/SKILL.md) |
| Offline UI catalog (no API) | [storybook/offline-first.md](../storybook/offline-first.md) |
| Code quality (F.I.R.S.T.) | [clean-code](../clean-code/SKILL.md) |

## Commands

| Scope | Command |
|-------|---------|
| API done gate | `pnpm test:api-done-gate` or `composer done-gate` in `packages/api` |
| API PHPUnit (package) | `composer test` in `packages/api` |
| Apps Vitest | `pnpm test` in `packages/apps` |
| API e2e (Docker) | `pnpm test:api-e2e:docker` |

Handoff and PR verification: [developer/done-checklist.md](../developer/done-checklist.md). Policy vs CI: [.agents/POLICY.md](../../POLICY.md). Review gate: [code-review](../code-review/SKILL.md).

## Multitask

- Test **hardening / verify** chunks run after build chunks merge; red-green tests belong with or before build — see [developer/multitask.md](../developer/multitask.md).
- After parallel builds, parent agent runs full verification suite.
- Do not mark plan todos complete until tests actually pass.

## API depth

PHPUnit architecture, `WgwDatabaseTestCase`, factories, and greenfield guard: [api/testing.md](../api/testing.md).

## UI depth

Vitest layout, hook testing, Storybook vs unit split: [ui-architecture.md](ui-architecture.md).
