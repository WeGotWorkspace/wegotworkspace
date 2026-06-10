# Multitask / parallel agent workflow

Use when splitting work across parallel agents (Cursor `/multitask`, Build in Parallel, or separate Claude Code sessions).

## When to parallelize

**Safe in parallel:**
- Independent API domains (different route groups, no shared OpenAPI schema edits)
- Independent UI panes or primitives (no shared CSS token changes)
- Docs-only chunks
- Tests for already-merged build chunks

**Must be sequential:**
- OpenAPI contract changes → then implementation → then typegen consumers
- Shared workspace CSS tokens (`workspace-split-app.css`) → then pane refactors
- Database migrations affecting multiple domains

## Plan chunk format

Each chunk in a plan should include:

| Field | Example |
|-------|---------|
| `id` | `api-auth-refresh` |
| `owner` | builder / tester / documenter |
| `skill` | `api`, `apps-ui`, `testing`, … |
| `inputs` | OpenAPI paths, files, prior chunk IDs |
| `done-when` | Feature tests pass; smells checklist on touched files |
| `verify-with` | `pnpm test:api-done-gate`, `pnpm test` in apps, Storybook a11y addon |

## Handoff rules

1. **Build chunks** load the domain skill (`api`, `apps-ui`, `workspace`) plus `clean-code`.
2. **Test chunks** run after their build chunk; load `testing` and route to `api/testing.md` or `ui-architecture.md`.
3. **Doc chunks** run after behavior is stable; load `document` — do not create markdown the user did not ask for.
4. **Story + a11y chunks** for UI: load `storybook` and `accessibility` when adding or changing stories.

## Post-parallel sync

After parallel builds finish:

1. Parent agent reconciles todos / plan status (subagents may not auto-update plan todos).
2. Run full verification: API done-gate + apps Vitest + spot-check Storybook a11y.
3. Resolve merge conflicts before declaring done.

## Example split

Feature: new admin pane + unrelated API health endpoint.

| Chunk | Parallel? | Skill |
|-------|-----------|-------|
| A: OpenAPI + Laravel health route | — | `api` |
| B: Admin pane UI + workspace CSS | Yes (with A if no shared files) | `workspace`, `apps-ui` |
| C: Stories for pane | After B | `storybook`, `accessibility` |
| D: Feature + unit tests | After A/B | `testing` |
