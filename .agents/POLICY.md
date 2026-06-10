# Agent policy vs enforcement

Policies agents should follow for **new work**. Backlog gaps are tracked on GitHub — do not treat “policy only” rows as optional for code you add today.

| Policy | New work | Enforced how | Tracking |
|--------|----------|--------------|----------|
| **API greenfield** | Reimplement from OpenAPI; no legacy PHP | `composer greenfield:guard`, architecture tests, done gate | [api/SKILL.md](skills/api/SKILL.md) |
| **OpenAPI → failing feature test → implement** | Required for new REST behavior | CI: `pnpm test:api-done-gate` (feature suites) | [testing/test-first.md](skills/testing/test-first.md) |
| **Operations DI** (App → operations → controller → pane) | Required in touched UI | Review + incremental refactor | [apps-ui/components.md](skills/apps-ui/components.md) — product verticals done in [#77](https://github.com/WeGotWorkspace/wegotworkspace/pull/77) |
| **Mock-tier Storybook** for every new export | Required | CI: `pnpm check:storybook-coverage` (baseline — no new gaps) | [storybook/offline-first.md](skills/storybook/offline-first.md) — audit closed in [#72](https://github.com/WeGotWorkspace/wegotworkspace/issues/72) / [#76](https://github.com/WeGotWorkspace/wegotworkspace/pull/76) |
| **Live-tier stories** (`Live …`) | Optional smoke only; never sole coverage | Manual | [storybook/offline-first.md](skills/storybook/offline-first.md) |
| **Story `play` functions** | Target for critical UI flows | Not in CI | [testing/test-first.md](skills/testing/test-first.md) |
| **`@storybook/addon-vitest`** | Target | CI: `pnpm --filter @wgw/apps run test:storybook:ci` (smoke-tagged stories); full catalog locally via `test:storybook` | [storybook/offline-first.md](skills/storybook/offline-first.md) — wired in [#74](https://github.com/WeGotWorkspace/wegotworkspace/pull/74) |
| **Vitest for hooks / pure logic** | Required when adding non-trivial logic | `pnpm test` in CI (`@wgw/apps`) | [testing/ui-architecture.md](skills/testing/ui-architecture.md) |
| **UI pane RTL tests** | Encouraged for interaction-heavy panes | Not widespread today | — |
| **UI e2e (Playwright apps)** | Out of scope | — | — |
| **WCAG 2.2 AA** | Required for new/changed UI | Storybook a11y addon (manual) | [accessibility/SKILL.md](skills/accessibility/SKILL.md) |
| **No auto-commits / PRs** | Always | User instruction | [git-workflow/SKILL.md](skills/git-workflow/SKILL.md) |
| **Signed commits on `main`** | Required for merge | Branch protection | [git-workflow/pull-requests.md](skills/git-workflow/pull-requests.md) |

**Domain skills override** generic rows when more specific ([clean-code](skills/clean-code/SKILL.md), [api/layers.md](skills/api/layers.md), etc.).

Before handoff, run [developer/done-checklist.md](skills/developer/done-checklist.md).
