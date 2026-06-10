---
name: code-review
description: PR and handoff review checklist — issue acceptance criteria, smells scan, policy vs CI, done-checklist verification. Use when reviewing diffs, preparing merge-ready work, or asked to code-review.
---

# Code review

Lightweight gate before handoff or PR — not a second copy of domain skills.

## Order

0. **Issue-linked work:** [verify-issue](../verify-issue/SKILL.md) — acceptance criteria report (`ISSUE_SATISFIED` or documented partial) before technical gates below.
1. **[clean-code/smells.md](../clean-code/smells.md)** — scan touched files (required).
2. **[developer/done-checklist.md](../developer/done-checklist.md)** — run commands for packages you changed.
3. **[POLICY.md](../../POLICY.md)** — new work must meet policy rows; do not treat baseline/backlog gaps as excuses for new violations.
4. **[git-workflow](../git-workflow/SKILL.md)** — no commits or PRs unless the user asked; signed commits on `main`.

## Domain depth (load when relevant)

| Area | Skill |
|------|-------|
| API / OpenAPI / layers | [api](../api/SKILL.md) |
| UI / operations DI / CSS | [apps-ui](../apps-ui/SKILL.md), [workspace](../workspace/SKILL.md) |
| Stories / coverage | [storybook](../storybook/SKILL.md) |
| Tests / red-green | [testing](../testing/SKILL.md) |

## Blockers vs nits

- **Block:** unmet issue acceptance criteria ([verify-issue](../verify-issue/SKILL.md)), policy violation in new code, missing tests for new behavior, secrets, legacy API PHP, live HTTP in panes.
- **Nit:** pre-existing debt outside the diff — note or link an issue; do not expand scope.

## Multitask merges

After parallel chunks:

1. Parent spawns a read-only **verifier subagent** when [multitask-verifier.md](../developer/multitask-verifier.md) applies (shared contracts, 2+ build chunks, full-stack).
2. Parent runs full [done-checklist](../developer/done-checklist.md) commands.
3. This skill's order (verify-issue when applicable → smells → done-checklist → policy) is the verifier's script — do not duplicate checklists in verifier prompts; link to those docs.
