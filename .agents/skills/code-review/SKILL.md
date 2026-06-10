---
name: code-review
description: PR and handoff review checklist — smells scan, policy vs CI, done-checklist verification. Use when reviewing diffs, preparing merge-ready work, or asked to code-review.
---

# Code review

Lightweight gate before handoff or PR — not a second copy of domain skills.

## Order

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

- **Block:** policy violation in new code, missing tests for new behavior, secrets, legacy API PHP, live HTTP in panes.
- **Nit:** pre-existing debt outside the diff — note or link an issue; do not expand scope.

## Multitask merges

After parallel chunks: parent runs full [done-checklist](../developer/done-checklist.md) and smells on the combined diff ([multitask.md](../developer/multitask.md)).
