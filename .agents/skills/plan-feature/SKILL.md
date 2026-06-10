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

## Test plan
- …

## Doc updates (only if user wants)
- …
```

## Parallelization rules

**Safe in parallel:** independent API domains, independent UI panes, docs-only work.

**Sequential:** OpenAPI before implementation; shared CSS tokens before pane refactors; migrations before dependent features.

See [developer/multitask.md](../developer/multitask.md) for handoff format and post-parallel sync.

## Quality bar

Chunk `done-when` should reference:

- Domain skill requirements (e.g. API feature tests, apps-ui CSS rules)
- [clean-code](../clean-code/SKILL.md) smells checklist on touched files
- [testing](../testing/SKILL.md) commands where applicable
