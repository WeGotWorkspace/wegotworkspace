# Multitask / parallel agent workflow

Use when splitting work across parallel agents (Cursor `/multitask`, Build in Parallel, or separate Claude Code sessions).

## Specs and tasks.md

Feature work on `feat/` branches should have `.agents/specs/<N>-<slug>/` with `plan.md` chunks and matching rows in `tasks.md`.

| plan.md | tasks.md |
|---------|----------|
| Chunk `id` field (e.g. `api-drive-share`) | Same `id` in the tasks table |
| `done-when`, `verify-with` | `verify command` column |
| `skill`, `inputs` | `skill`, `key paths`, `owner / agent` |

**`tasks.md` is engineering work tracking — not the GitHub issue `- [ ]` checklist.** Issue AC stays on GitHub; verify with [verify-issue](../verify-issue/SKILL.md).

Hand off each parallel agent with: branch/worktree name, chunk `id`, the matching `tasks.md` row, and paths from `plan.md`.

## When to parallelize

**Safe in parallel:**
- Independent API domains (different route groups, no shared OpenAPI schema edits)
- Independent UI panes or primitives (no shared CSS token changes)
- Docs-only chunks
- **Hardening / verify chunks** after build chunks merge (extra coverage, full-suite runs — not red-green tests)

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
2. **Red-green tests** (API failing feature tests, UI mock-tier stories) belong in the **same chunk as, or immediately before**, the build that implements behavior — see [testing/test-first.md](../testing/test-first.md). Do not implement first and add tests later.
3. **Hardening / verify chunks** run **after** build chunks merge; load `testing` and route to `api/testing.md` or `ui-architecture.md`. Safe to parallelize across independent domains.
4. **Doc chunks** run after behavior is stable; load `document` — do not create markdown the user did not ask for.
5. **Story + a11y chunks** for UI: load `storybook` and `accessibility` when adding or changing stories.

## Post-parallel sync

After parallel builds finish:

1. Parent agent reconciles todos / plan status (subagents may not auto-update plan todos).
2. Resolve merge conflicts before verification.
3. Spawn a **verifier subagent** when cross-chunk review is needed — see [multitask-verifier.md](multitask-verifier.md) for when to skip vs spawn, checklist, and prompt template.
4. Run full verification per [done-checklist.md](done-checklist.md) (parent runs commands; verifier reports gaps).

## Example split

Feature: new admin pane + unrelated API health endpoint.

| Chunk | Parallel? | Skill |
|-------|-----------|-------|
| A: OpenAPI + failing feature test + Laravel health route | — | `api`, `testing` |
| B: Admin pane UI + workspace CSS | Yes (with A if no shared files) | `workspace`, `apps-ui` |
| C: Mock-tier stories for pane | With or after B | `storybook`, `accessibility` |
| D: Full verify (done gate + Vitest) | After A/B merge | `testing` |
| V: Cross-chunk verifier (read-only) | After D or with D if disjoint domains | `code-review` via [multitask-verifier.md](multitask-verifier.md) |
