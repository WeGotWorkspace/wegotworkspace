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
2. **`test:contract`** — UI ↔ OpenAPI adapter + type parity (`src/lib/api/contract/`)
3. **Vitest unit** — pure logic (`*.test.ts`, Node)
4. **Vitest jsdom** — hooks and RTL (`*.test.tsx`)
5. **Storybook Vitest smoke** — stories tagged `vitest-ci` (browser + `play` + a11y `error`)
6. **Storybook coverage** — `check:storybook-coverage` (no new export gaps)

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
| **Contract (`test:contract`)** | Settings + list-app mappers preserve required OpenAPI fields; `expectTypeOf` documents UI-only vs API-derived shapes. |
| **Vitest unit** | Pure parsers, mappers, RTC/session helpers — co-located `*.test.ts`. |
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

### UI vs API shape policy

| Layer | Role | Example |
|-------|------|---------|
| **`@wgw-api-generated/*`** | Canonical HTTP request/response types from OpenAPI | `SettingsStateResponse`, `MailMessageListItem` |
| **`lib/api/wgw/types.ts`** | App narrowing on generated types (optional fields, wire aliases) | `WgwMailMessageListItem` adds required `folder` + `uid` |
| **`*UIData` / `*Operations`** | Hand-maintained UI contract consumed by panes/hooks | `SettingsUIData`, `MailUIData` |
| **Mappers** (`lib/api/wgw/*.ts`) | OpenAPI JSON → `*UIData`; must preserve every **required** API field | `mapWgwSettingsStateToUI`, `mailFromWgwListItem` |

**When to narrow or rename**

- **1:1 copy** — keep the OpenAPI field name on `*UIData` when the pane displays it directly (settings profile, mail server fields).
- **Rename for UI** — allowed when the semantic mapping is stable and documented in contract tests (e.g. `subject` → `Mail.title`, `read` → inverted `Mail.unread`, `starred`/`flagged` → `Mail.starred`).
- **UI-only fields** — enrich in the mapper (excerpt, wordCount, mailbox display label); document via `expectTypeOf` in `src/lib/api/contract/` so they are not mistaken for API fields.
- **Request bodies** — always use generated types or OpenAPI Zod schemas; never duplicate with hand-rolled interfaces.

**Contract tests** (`pnpm --filter @wgw/apps run test:contract`, also in done gate):

- `expectTypeOf` / `satisfies` — API-derived slices of `*UIData` stay aligned with generated types.
- Adapter round-trip — OpenAPI-shaped fixtures → mapper → `assertFieldMappings` on required fields; **CI fails if a mapper drops a listed field**.

Add contract coverage when introducing a new `*UIData` mapper or changing OpenAPI response shapes for settings or list apps.

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
