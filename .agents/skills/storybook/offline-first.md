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

Prefer mock-tier **`play`** functions for critical flows (`storybook/test`). Vitest browser smoke uses the `vitest-ci` tag — see [.agents/POLICY.md](../../POLICY.md) for what CI runs vs local-only.

When adding `play` tests, keep them on **mock-tier** stories only. DOM-heavy logic: [testing/ui-architecture.md](../testing/ui-architecture.md).

## Live-tier checklist (optional stories)

Only when integration validation is valuable:

1. Name story **`Live …`** and document API requirement in `parameters.docs.description.story`.
2. Use `WeGotWorkspaceLive` or pass live `apiBaseUrl` — proxy handles `/api/v1`.
3. Document setup: `pnpm setup:storybook-live-api`, `pnpm docker:up`, restart Storybook.
4. Never remove mock-tier stories when adding live-tier.

## Done-when (new UI)

Use the UI section of [developer/done-checklist.md](../developer/done-checklist.md) — mock-tier story, offline render, stub `operations`, a11y panel.

## Coverage status

**111/111** surfaces covered (2026-06-10). Baseline is empty — CI fails on any new export without mock-tier stories.

Run `node packages/apps/scripts/check-storybook-coverage.mjs --update-baseline` in `packages/apps` only when intentionally recording new gaps during a phased rollout; prefer adding stories instead.

### Storybook baseline batches (#76)

| Batch | Surfaces | Baseline |
|-------|----------|----------|
| **A** | AdminPluginsPane, AdminSearchPane, DocsMainPane, MailAttachmentChip, MeetWorkspaceHeader, NoteTextEditorBody | 24 → 18 |
| **B** | CommentMark, SuggestionMark, TextEditorSlashMenu, TextEditorTableControls, DocsCollabEditor, DocsCollabPresence | 18 → 12 |
| **C+D** | DocsCollabDebugWorkspace, Wegotworkspace shell (11 exports) | 12 → **0** |

### Honest grade (agent stack — snapshot post #77)

| Dimension | Post P0–P2 | Post P3 (#74+#75) | #76 | Now (#77) | Notes |
|-----------|------------|-------------------|-----|-----------|-------|
| Structure & routing | A− | A− | A− | **A** | Install DI pattern now standard for meet, docs, drive, mail, install |
| Accuracy vs repo | B+ | A− | **A** | **A** | Baseline **0**; coverage CI matches policy |
| Actionability | B+ | A− | A− | **A** | Every major product vertical has copyable DI + mock-story path |
| Multitask readiness | B− | B+ | **A−** | **A** | #74→#77 stack; vertical boundaries clean for parallel agents |
| Maintenance | B | B+ | **A** | **A** | Baseline debt gone (24→0); ops DI tracker closed |
| Token efficiency | B | B+ | B+ | B+ | Shared `lib/files`, `lib/mail`, collab wire — modest gain |
| Enforcement | B− | B+ | **A−** | **A−** | Coverage + vitest-ci smoke in CI; `play`/WCAG/Chromatic partial |
| **Overall** | B+ | **A−** | **A** | **A** | Held at **A** — structure caught up; A+ blockers remain |

#### Readiness by use case

| Use case | Post P3 (#75) | Now (#77) |
|----------|---------------|-----------|
| Solo agent on API work | A− | A− |
| Solo agent on UI work | A− (install only) | **A** — five products share DI + mock-story pattern |
| Multitask parallel agents | B+ | **A** |
| Occasional contributor | B+ | B+ |
| “Docs match reality” | A− | **A** |

#### On main (#74–#77)

| Chunk | Status |
|-------|--------|
| Vitest smoke + addon-vitest (#74) | ✅ |
| Install reference vertical (#75) | ✅ |
| Storybook baseline **24 → 0**, **111/111** (#76) | ✅ |
| Ops DI — meet, docs, drive, mail, install (#77) | ✅ |
| #66–#71, #72 closed | ✅ |

#### Still between A and A+

| Gap | Status |
|-----|--------|
| Storybook baseline debt | **0** — CI fails on new exports without stories |
| Ops DI in product controllers/hooks/workspaces | **Done** (#77); wgw remains in `*-api-source`, app shells, login |
| `play` / WCAG / Chromatic | **Partial** — 5 `play`, 10 `vitest-ci` of 111; a11y manual; Chromatic not CI-gated |
| Multitask verifier subagents | **Not built** |

Do not add live-only stories for components lacking offline coverage.
