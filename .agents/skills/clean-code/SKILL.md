---
name: clean-code
description: Code review checklist for touched files — scan smells before handoff. Domain skills override when more specific. Optional depth in architecture.md and principles.md.
paths:
  - "packages/api/app/**"
  - "packages/apps/src/**"
---

# Clean code (review checklist)

**Load [smells.md](smells.md) and scan touched files before handoff** — especially multitask chunk merges and PR-ready work.

Domain skills override when more specific ([api/layers.md](../api/layers.md), [apps-ui](../apps-ui/SKILL.md), OpenAPI parity, forbidden patterns in [api/SKILL.md](../api/SKILL.md)).

## When reviewing

1. Run the [smells.md](smells.md) checklist on the diff.
2. Prefer fixing small issues in files you already touch (Boy Scout Rule).
3. Do not block feature delivery on unrelated refactors — file issues for out-of-scope debt.

## Optional depth

| Topic | Read |
|-------|------|
| Smells checklist (primary) | [smells.md](smells.md) |
| Architecture dependency rule | [architecture.md](architecture.md) |
| Generic Robert C. Martin notes | [principles.md](principles.md) |

## Tests

F.I.R.S.T. reminders live in [smells.md](smells.md). Commands: [testing](../testing/SKILL.md). Handoff/PR gate: [code-review](../code-review/SKILL.md).
