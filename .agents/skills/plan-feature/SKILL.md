---
name: plan-feature
description: Feature planning workflow for the WeGotWorkspace monorepo — research checklist, plan template, parallelization rules, and chunk handoffs. Use when scoping a feature, breaking down work, or preparing for multitask builds.
---

# Feature planning

## When to plan

Plan before building when:

- Multiple packages touched (API + UI)
- OpenAPI or shared CSS contract changes
- Requirements are unclear or conflicting
- Work will run in parallel across agents

Skip formal planning for single-file fixes with obvious scope.

## Research checklist

Before writing the plan:

- [ ] GitHub issue (if any): fetch with `gh issue view` and copy acceptance criteria into chunk `done-when` — verify later with [verify-issue](../verify-issue/SKILL.md)
- [ ] Relevant domain skill (`api`, `apps-ui`, `workspace`)
- [ ] OpenAPI contract if API involved: `packages/api/openapi/openapi.json`
- [ ] Done gate if API involved: `packages/api/docs/api-done-gate.md`
- [ ] Existing tests and stories for the area
- [ ] `developer/multitask.md` if parallel execution expected

## Plan template

```markdown
# [Feature title]

## Goal
[One paragraph]

## Non-goals
- …

## Affected packages
- packages/api | packages/apps | docs

## Dependencies
[Ordered list — what must complete before what]

## Chunks

### Chunk A: [name]
- **Skill:** api | apps-ui | workspace | testing | document | storybook
- **Inputs:** …
- **Done when:** …
- **Verify with:** command or checklist
- **Parallel with:** chunk IDs or "none"

Optional final chunk after parallel builds merge:

- **Chunk V: Cross-chunk verify** — read-only verifier subagent; prompt from [developer/multitask-verifier.md](../developer/multitask-verifier.md); `done-when`: verifier `PASS` or `PASS_WITH_NITS` and parent ran [done-checklist](../developer/done-checklist.md).

## Test plan

- [ ] API: OpenAPI → failing feature test → implement → `composer done-gate` ([testing/test-first.md](../testing/test-first.md))
- [ ] UI: mock-tier Storybook → Vitest for logic → optional `play` for critical flows
- [ ] …

## Doc updates (only if user wants)
- …
```

## Parallelization

**Canonical rules:** [developer/multitask.md](../developer/multitask.md) — safe vs sequential ordering, red-green vs verify chunks, handoffs, post-parallel sync. **Do not restate those rules in plans**; set **Parallel with** on each chunk instead.

## Quality bar

Chunk `done-when` should reference:

- [verify-issue](../verify-issue/SKILL.md) when work tracks a GitHub issue
- [developer/done-checklist.md](../developer/done-checklist.md) commands where applicable
- Domain skill requirements (e.g. API feature tests, apps-ui CSS rules)
- [clean-code](../clean-code/SKILL.md) smells checklist on touched files
- [.agents/POLICY.md](../../POLICY.md) for policy vs enforced expectations

**Collab / text-editor UI:** split plan chunks into **pure lib** (schema, map writes, editor actions — Vitest on exports) vs **orchestrator** (sub-hooks + thin public hook — RTL on contracts). See [workspace/collab-hooks.md](../workspace/collab-hooks.md).
