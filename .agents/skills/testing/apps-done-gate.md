# Apps done gate

Use this checklist before calling substantial `packages/apps` UI work **done** or merging feature slices that touch panes, hooks, or stories.

## One command

From the repo root:

```bash
pnpm test:apps-done-gate
```

Or inside `packages/apps`:

```bash
pnpm run test:done-gate
```

This runs, in order:

1. **`typecheck`** — `tsc -p tsconfig.typecheck.json`
2. **Vitest unit** — pure logic (`*.test.ts`, Node)
3. **Vitest jsdom** — hooks and RTL (`*.test.tsx`)
4. **Storybook Vitest smoke** — stories tagged `vitest-ci` (browser + `play` + a11y `error`)
5. **Storybook coverage** — `check:storybook-coverage` (no new export gaps)

Full CI-quality stack (typegen, lint, format, API + apps gates):

```bash
pnpm run ci:quality
```

CI runs apps Vitest via `turbo run test` and Storybook smoke via `test:storybook:ci` (see `.github/workflows/ci.yml`).

## Reading the output

`pnpm run test:done-gate` prints labeled steps and a final summary. **Exit code 0 = passed.**

## What each layer means

| Layer | Enforces |
|-------|----------|
| **Typecheck** | TS contracts compile; OpenAPI-generated types (`@wgw-api-generated`) match consumers. |
| **Vitest unit** | Pure parsers, mappers, RTC/session helpers — co-located `*.test.ts`. Non-meet domains with unit coverage: `lib/api/wgw/*-utils`, `route-guard`, `mail-core/*-utils`, `drive-core/*-utils`, `notes-core/*-utils`, `admin-core/*-utils`, `hooks/collection-controller-utils`. |
| **Vitest jsdom** | Hook and pane RTL with **mock `operations`** — co-located `*.test.tsx`. |
| **Storybook `vitest-ci`** | Offline mock-tier stories render; `play` asserts critical interactions; a11y `error` via `STORYBOOK_A11Y_GATE=1` (set by gate and CI). |
| **Storybook coverage** | Every exported pane/component has a mock-tier story ([storybook/offline-first.md](../storybook/offline-first.md)). |

## Interaction test targets (ongoing)

Baseline audit (expand over time — not a hard gate count yet):

| Signal | Current (post #81) | Near-term target |
|--------|--------------------|------------------|
| Story files | ~101 | + mock-tier for every new export |
| `vitest-ci` tagged story files | **18** (primitives + all 7 product verticals) | **25+** — deeper flows per app |
| `play` functions | **14** | One `play` per touched pane in new work |
| WCAG gate | **On** in CI smoke + done gate | Keep `vitest-ci` stories violation-free |

Tag product-pane smoke stories at **meta** or **story** level with `vitest-ci`. Every major vertical (Drive, Mail, Settings, Install, Notes, Meet, Docs, Admin) has at least one `play` flow — keep it that way for new verticals.

## Type contracts (UI ↔ API)

1. **HTTP shapes** come from `packages/api/openapi/openapi.json` → `@wgw-api-generated/*`.
2. **Form → request** mappers must use OpenAPI Zod helpers (e.g. `settingsProfileRequestOpenapiSchema.parse`) — see `settings-profile-form-schema.ts`.
3. After OpenAPI changes: `pnpm --filter @wgw/api run openapi:build-json` + apps `typecheck`.
4. Do **not** hand-roll request types that duplicate generated schemas.

## When implementing UI

1. **Mock-tier story first** for new exports ([test-first.md](test-first.md)).
2. **Vitest** for non-trivial hooks/parsers ([ui-architecture.md](ui-architecture.md)).
3. **`vitest-ci` + `play`** for one critical interaction per touched product pane.
4. Run **`pnpm run test:done-gate`** before handoff.

## Out of scope for this gate

- **Live-tier stories** (`Live …`) — manual smoke only.
- **Apps Playwright e2e** — not in CI.
- **Chromatic** — optional; enable with repo variable `CHROMATIC_ENABLED=true` and `CHROMATIC_PROJECT_TOKEN` secret (see `.github/workflows/ci.yml`).
- **Full Storybook Vitest catalog** — run locally: `pnpm --filter @wgw/apps run test:storybook`.

## Definition of done (UI slice)

- `pnpm run test:done-gate` green
- `pnpm check:storybook-coverage` green (included in gate)
- Mock-tier stories for changed exports; a11y panel checked in dev
- No `@/lib/api/wgw/http` imports in panes ([apps-ui/components.md](../apps-ui/components.md))
