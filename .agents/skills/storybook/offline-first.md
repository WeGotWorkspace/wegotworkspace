# Offline-first Storybook (required)

Storybook is the **primary UI lab** for `packages/apps`. Every exported component, pane, and app shell must be explorable **without a live API**.

## Two tiers

| Tier | Required? | API | Story naming |
|------|-----------|-----|--------------|
| **Mock / offline** | **Yes** — default for every export | None — mock bootstrap + stub `operations` | `Default`, variant names, product names |
| **Live** | Optional — integration smoke only | Storybook proxy `/api/v1` → dev API | Prefix **`Live …`** (e.g. `Live API`, `Live Docs`) |

**Rule:** If Storybook runs with only `pnpm dev:ui` (no Docker, no API), all **mock-tier** stories must render and remain interactive for UI flows that do not inherently need real persistence (forms, toggles, navigation chrome, dialogs).

Live-tier stories may fail without `pnpm docker:up` / `pnpm setup:storybook-live-api` — that is acceptable. They must **not** be the only story for a component.

Reference live pattern: `packages/apps/src/wegotworkspace/stories/wegotworkspace.stories.tsx` (`Default` offline vs `Live API`).

## 100% coverage target

Every **exported** UI surface under `packages/apps/src/**` that ships to users needs mock-tier stories:

| Surface | Story location |
|---------|----------------|
| Shared primitive / composite | `*/stories/*.stories.tsx`, title `Shared/…` |
| Product pane / workspace / app | `*-core/stories/…`, title `Apps/{Product}/…` |

Minimum per export:

- At least one **Default** (or clearly named primary) story
- Variant matrix for meaningful states — see [coverage.md](coverage.md)
- Side effects stubbed — see [fixtures.md](fixtures.md) and [apps-ui/components.md](../apps-ui/components.md)

Adding a new exported component **without** mock-tier stories is incomplete work.

## Mock data sources (use these, not live fetch)

| Need | Source |
|------|--------|
| App bootstrap (`data`, `session`) | `@/lib/api/mock/*-bootstrap` (`settings-bootstrap`, `mail-bootstrap`, …) |
| Writable flows | `createMock*Operations()` or no-op handlers on controller slices |
| Workspace session | `@/lib/api/mock/workspace-session-mock` |
| Search / lists | Local fixtures, `mockFetcher`, seed files (`mail-seed`, `notes-wgw-story-seed`) |
| Docs content | `createDocsAppBootstrap`, `docs-mock-operations` |

**Do not** call `@/lib/api/wgw/http` or `wgwFetch*` from story files. Wire mocks in `args`, harnesses, or `render`.

## Interactivity without API

Mock-tier stories must support **manual exploration**:

- Knobs / `argTypes` for props (primitives)
- Harnesses for panes (settings profile pattern)
- Stub handlers that update local state where the real app would persist (optional but preferred for forms)
- Router: `parameters.routerPath` or `wegotworkspaceRouter: true` — see [fixtures.md](fixtures.md)

Users and agents should never need the API to click through UI states, open menus, or validate layout/a11y.

## Automated interaction tests

| Layer | Tool | Status |
|-------|------|--------|
| Manual | Storybook UI at http://127.0.0.1:6006 | **Supported today** |
| a11y | `@storybook/addon-a11y` | **Supported** — see [a11y-testing.md](a11y-testing.md) |
| Story `play` functions | CSF `play` + `@storybook/test` | **Target** — add for critical interactions |
| Storybook in Vitest | `@storybook/addon-vitest` | **Wired** — CI smoke: `pnpm --filter @wgw/apps run test:storybook:ci` (`vitest-ci` tag); full catalog locally: `test:storybook` |

When adding `play` tests, keep them on **mock-tier** stories only.

Vitest component tests that need DOM: prefer testing harnesses with injected props ([testing/ui-architecture.md](../testing/ui-architecture.md)) — do not duplicate every story in Vitest unless the interaction is critical.

## Live-tier checklist (optional stories)

Only when integration validation is valuable:

1. Name story **`Live …`** and document API requirement in `parameters.docs.description.story`.
2. Use `WeGotWorkspaceLive` or pass live `apiBaseUrl` — proxy handles `/api/v1`.
3. Document setup: `pnpm setup:storybook-live-api`, `pnpm docker:up`, restart Storybook.
4. Never remove mock-tier stories when adding live-tier.

## Done-when (new UI)

- [ ] Mock-tier story exists for every new export
- [ ] Story runs with `pnpm dev:ui` only (no API)
- [ ] Writes use stub `operations` / slice handlers, not live HTTP
- [ ] a11y panel checked on new stories
- [ ] Live-tier added only if needed, clearly labeled

## Known gaps

Coverage is **audited in CI** via `pnpm check:storybook-coverage` (baseline in `packages/apps/scripts/storybook-coverage-baseline.json`). Tracking: [#72](https://github.com/WeGotWorkspace/wegotworkspace/issues/72). Run `node scripts/check-storybook-coverage.mjs --update-baseline` in `packages/apps` after adding stories for baseline entries. Do not add live-only stories for components lacking offline coverage.
