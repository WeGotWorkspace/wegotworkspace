# Chromatic visual regression

Chromatic captures Storybook snapshots for visual diff review. In this repo it is **fully wired but dormant** ([#80](https://github.com/WeGotWorkspace/wegotworkspace/issues/80)) — CI runs only when a maintainer opts in with repo settings. Baselines are not accepted yet ([#85](https://github.com/WeGotWorkspace/wegotworkspace/issues/85)).

**Policy:** optional for new work; not part of `pnpm test:apps-done-gate`. See [.agents/POLICY.md](../../POLICY.md) and [apps-done-gate.md](../testing/apps-done-gate.md).

### Issue #85 scope

| Slice | Status | Blocker |
|-------|--------|---------|
| Document gating policy + CI wiring | **Done** (this doc, `POLICY.md`, `apps-done-gate.md`) | — |
| Create project, token, enable variable, accept baselines, hard-fail decision | **Open** | Requires `CHROMATIC_PROJECT_TOKEN` and maintainer Chromatic UI access — cannot be completed in-repo without secrets |

## Current gating policy

| Setting | Value | Effect |
|---------|-------|--------|
| `exitZeroOnChanges` | `true` (CI + local script default) | CI **does not fail** on unreviewed visual changes; Chromatic publishes builds for human review in the Chromatic UI |
| `onlyChanged` (TurboSnap) | `true` (dedicated CI job) | Limits snapshot count to stories affected by the diff |
| Repo variable `CHROMATIC_ENABLED` | unset / not `true` | All Chromatic CI steps are skipped |

**Decision (Jun 2026):** keep publish-only (`exitZeroOnChanges`) until baselines exist and snapshot volume is understood. Switching to hard-fail on unreviewed changes is a separate maintainer decision — update `.github/workflows/ci.yml` and this doc when that changes.

Free tier is ~5k snapshots/month; TurboSnap and smoke-only Storybook Vitest help stay within budget. Full catalog is **111 exported surfaces** (~101 story files).

## CI wiring (verified)

File: `.github/workflows/ci.yml`

When `vars.CHROMATIC_ENABLED == 'true'`:

1. **`build` job — inline step** (after Storybook Vitest smoke):
   - `pnpm --filter @wgw/apps exec chromatic --build-script-name build-storybook --exit-zero-on-changes`
   - Uses `secrets.CHROMATIC_PROJECT_TOKEN` via `CHROMATIC_PROJECT_TOKEN` env.

2. **`chromatic` job** (parallel dedicated job, skips release commits on push):
   - `chromaui/action@v13` with `workingDir: packages/apps`
   - `onlyChanged: true`, `exitZeroOnChanges: true`
   - Same `secrets.CHROMATIC_PROJECT_TOKEN`.

Both paths publish when enabled. Consider consolidating to the dedicated job only if double publishes become costly ([#85](https://github.com/WeGotWorkspace/wegotworkspace/issues/85) follow-up).

Chromatic is **not** part of branch-protection required checks until maintainers explicitly add it.

## Enablement checklist (maintainers — requires secrets)

Complete in order; steps 1–3 need org/repo admin access:

- [ ] Create a Chromatic project linked to this repo (GitHub integration recommended).
- [ ] Add repository secret `CHROMATIC_PROJECT_TOKEN` (project token from Chromatic → Manage → Configure).
- [ ] Set repository variable `CHROMATIC_ENABLED` to `true` (Settings → Secrets and variables → Actions → Variables).
- [ ] Trigger CI on a PR; open the Chromatic build link from the job log.
- [ ] Accept initial baselines for the full mock-tier catalog (111 surfaces / ~101 story files; expect a large first build).
- [ ] Confirm TurboSnap (`onlyChanged`) behaves as expected on a small UI PR.
- [ ] Decide whether to keep `exitZeroOnChanges` (review-only) or gate merges on Chromatic approval — document the choice here and in `POLICY.md`.

## Local development (no token required)

Storybook and Vitest smoke cover offline visual confidence without Chromatic:

```bash
pnpm dev                       # Storybook at http://127.0.0.1:6006
pnpm test:apps-done-gate       # includes Storybook Vitest smoke + a11y gate
```

Optional local publish when you have a project token:

```bash
export CHROMATIC_PROJECT_TOKEN=chpt_…   # never commit
pnpm --filter @wgw/apps run chromatic
```

Package script: `packages/apps/package.json` → `"chromatic": "chromatic --build-script-name build-storybook"`.

Storybook addon: `@chromatic-com/storybook` in `packages/apps/.storybook/main.ts`.

## Agent guidance

- Do **not** block UI work on Chromatic while dormant.
- Do **not** ask for or commit `CHROMATIC_PROJECT_TOKEN`.
- When touching stories, rely on mock-tier coverage, `vitest-ci` smoke, and a11y gate per [offline-first.md](offline-first.md).
