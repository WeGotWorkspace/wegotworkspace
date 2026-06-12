---
name: verify-issue
description: Verify GitHub issue acceptance criteria before handoff or PR — fetch issue, map criteria to checks, report pass/fail per criterion. Use when work tracks an issue, before declaring done, or when asked if an issue is satisfied.
---

# Verify GitHub issue acceptance criteria

Issue-linked work needs **two** gates:

1. **Issue AC** — this skill: each acceptance criterion verified with evidence.
2. **Repo quality** — [developer/done-checklist.md](../developer/done-checklist.md) + [code-review](../code-review/SKILL.md): tests, done gates, policy, smells.

Do not skip (2) after (1). Do not declare an issue done based on green CI alone if AC were never mapped.

## When to use

| Use | Skip |
|-----|------|
| User or plan references an issue (`#123`, issue URL) | Drive-by fix with no issue |
| Before handoff: "is this done?", "verify the issue" | Pure refactor with no AC |
| Before PR when PR fixes/closes an issue | Docs-only typo with obvious scope |
| Parent after multitask merge for issue-scoped feature | Issue has no criteria and user did not ask for verification |

## Prerequisites

- Issue number or URL (e.g. `#80`, `https://github.com/ORG/REPO/issues/80`)
- Local branch or diff containing the implementation
- `gh` authenticated for the repo ([git-workflow](../git-workflow/SKILL.md) — use `gh` for GitHub tasks)

## Workflow (one pass)

### 1. Fetch the issue

From repo root (`gh` uses the current repository):

```bash
gh issue view <N> --json number,title,body,state,labels,url,closedAt
gh issue view <N> --comments          # optional — AC sometimes added in comments
```

Find linked PRs (if verifying an existing PR branch):

```bash
gh pr list --search "#<N> in:body" --state all --json number,title,url,state,headRefName
gh pr view <PR> --json body,commits,files   # when a specific PR is in scope
```

Read title + body + relevant comments. Note **state** (`OPEN`/`CLOSED`) but verify AC yourself — do not assume closed means satisfied.

### 2. Extract acceptance criteria

Pull every **testable** requirement into a numbered list. Sources, in order:

| Source | How to extract |
|--------|----------------|
| **Acceptance criteria** section | Headings: `Acceptance criteria`, `Acceptance Criteria`, `AC`, `Done when`, `Definition of done`, `Requirements` |
| **Task lists** | Markdown `- [ ]` / `- [x]` lines (GitHub task lists) |
| **Bug template fields** | `expected` / "What should happen instead" from [bug-report.yml](../../../.github/ISSUE_TEMPLATE/bug-report.yml) |
| **Description bullets** | Imperative bullets that state observable outcomes |
| **Linked docs** | Paths or skill links in the issue (e.g. `apps-ui/components.md` acceptance block) |

**Rules:**

- One row per criterion — split compound bullets ("add X and Y") into separate rows when they verify independently.
- Mark inferred criteria with `(inferred)` when there is no explicit AC section.
- If the issue is vague, list assumptions you are verifying and flag gaps in the report — do not silently invent scope.

### 3. Map each criterion to verification

For every criterion, pick one primary method and record the planned check:

| Method | When | Example |
|--------|------|---------|
| **Test command** | Issue mentions tests, behavior, API, hooks | `pnpm --dir packages/apps exec vitest run path/to.test.ts` |
| **Done gate** | Merge-ready / policy-level bar | `pnpm test:apps-done-gate`, `pnpm test:api-done-gate` |
| **Code inspection** | Structural rule, no test yet | `rg pattern packages/apps/src/…`, read named files |
| **OpenAPI / contract** | REST shape or endpoint | Diff `openapi.json`; feature test filter |
| **Storybook / manual** | UI state, a11y, visual | Mock-tier story exists; `pnpm dev:ui` + steps from issue |
| **Docs** | README / skill update requested | File exists; section matches AC |

Load domain depth when mapping: [testing](../testing/SKILL.md), [api](../api/SKILL.md), [apps-ui](../apps-ui/SKILL.md), [storybook](../storybook/SKILL.md).

**Planning:** If work was planned with [plan-feature](../plan-feature/SKILL.md), align chunk `done-when` / `Verify with` rows to these criterion IDs.

### 4. Run checks and collect evidence

Run the mapped commands and inspections. For each criterion record:

- **Status:** `PASS` | `FAIL` | `PARTIAL` | `BLOCKED` | `N/A`
- **Evidence:** command output summary, file path, test name, or grep result (one line)
- **Gap:** what is missing when not `PASS`

Then run the package-appropriate rows from [done-checklist.md](../developer/done-checklist.md) (smells via [code-review](../code-review/SKILL.md)).

### 5. Report

Use this template in handoff, PR body (when user asks), or parent agent summary:

```markdown
## Issue verification — #<N> <title>

**Issue:** <url>  
**Branch / PR:** <name or PR url>  
**Issue state:** OPEN | CLOSED (verified independently)

### Acceptance criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | … | PASS | `vitest …` green; `path/file.test.ts` |
| 2 | … | FAIL | missing mock-tier story for `ExportName` |
| 3 | … | PARTIAL | API test passes; UI story not added |

### Inferred / assumed (if any)

- …

### Repo quality gate

- [ ] [done-checklist](../developer/done-checklist.md) commands run for touched packages
- [ ] [smells](../clean-code/smells.md) scan on touched files

### Verdict

`ISSUE_SATISFIED` | `ISSUE_NOT_SATISFIED` | `ISSUE_PARTIAL`

**Blockers:** …  
**Follow-ups:** …
```

**Verdict rules:**

- `ISSUE_SATISFIED` — every criterion `PASS` or `N/A`; no blockers; done-checklist satisfied for scope.
- `ISSUE_PARTIAL` — only `N/A` or documented out-of-scope nits; at least one `PARTIAL` with user-approved deferral.
- `ISSUE_NOT_SATISFIED` — any `FAIL` or `BLOCKED` on a required criterion, or done-checklist not run.

Do not close the issue or claim "fixes #N" unless the user asked and verdict is `ISSUE_SATISFIED`.

## Integration with other skills

| Phase | Skill |
|-------|-------|
| Plan chunks from issue AC | [plan-feature](../plan-feature/SKILL.md) — copy AC into chunk `done-when` |
| Implement | Domain skills (`api`, `apps-ui`, …) |
| Issue AC gate | **verify-issue** (this doc) |
| Technical gate | [code-review](../code-review/SKILL.md) → [done-checklist](../developer/done-checklist.md) |
| Multitask merge | [multitask-verifier](../developer/multitask-verifier.md) for cross-chunk; then verify-issue for the parent issue |

## Related

- PR test plan wording: [git-workflow/pull-requests.md](../git-workflow/pull-requests.md), [testing/SKILL.md](../testing/SKILL.md)
- Policy vs backlog: [POLICY.md](../../POLICY.md)
