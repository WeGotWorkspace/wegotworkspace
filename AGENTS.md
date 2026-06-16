# Agent instructions (WeGotWorkspace)

## Non-negotiables

**API greenfield:** Work under `packages/api/` is a new Laravel app matching OpenAPI — no legacy PHP in tree. Do not restore `packages/api/src/`, `*Kernel`, `MailApi`, or dual autoload. Full guidance: [`.agents/skills/api/`](.agents/skills/api/).

**Git:** Do not `git commit` or open PRs unless the user explicitly asks. Commits must be **signed** (GPG or SSH) — see [`.agents/skills/git-workflow/`](.agents/skills/git-workflow/).

## Start here

Load **[developer](.agents/skills/developer/)** for dev layout, skill routing, multitask handoffs, and links to package-specific depth. **Policy vs CI:** [.agents/POLICY.md](.agents/POLICY.md). **Done verification:** [developer/done-checklist.md](.agents/skills/developer/done-checklist.md); issue AC: [verify-issue](.agents/skills/verify-issue/).

## Skills index

Agent skills live in [`.agents/skills/`](.agents/skills/) (tool-agnostic [Agent Skills](https://agentskills.io/) format). **Naming:** unprefixed directory names only — no `wgw-` skill prefixes.

| Skill | When to use |
|-------|-------------|
| [developer](.agents/skills/developer/) | Starting work, onboarding, skill routing, multitask |
| [dev-environment](.agents/skills/dev-environment/) | Docker, ports, Storybook proxy, troubleshooting |
| [api](.agents/skills/api/) | `packages/api` — REST, auth, storage, WebDAV, tests |
| [plugins](.agents/skills/plugins/) | Plugin registry, activation, install, Flysystem boundaries |
| [meet](.agents/skills/meet/) | Meet UI, RTC, room signaling |
| [apps-ui](.agents/skills/apps-ui/) | UI primitives, CSS variables, components, TypeScript |
| [workspace](.agents/skills/workspace/) | *App, *Workspace, workspace shell — [workspace-shells.md](packages/apps/docs/workspace-shells.md), [feature-blueprint.md](.agents/skills/workspace/feature-blueprint.md), [apps-done-gate.md](.agents/skills/testing/apps-done-gate.md) |
| [plan-feature](.agents/skills/plan-feature/) | Scoping features, parallel chunk plans |
| [verify-issue](.agents/skills/verify-issue/) | GitHub issue acceptance criteria — fetch, map, verify, report before handoff/PR |
| [testing](.agents/skills/testing/) | PHPUnit, Vitest, e2e, done-when checklists |
| [document](.agents/skills/document/) | README, API docs, dev-layout updates |
| [clean-code](.agents/skills/clean-code/) | Review checklist — [smells.md](.agents/skills/clean-code/smells.md) before handoff |
| [code-review](.agents/skills/code-review/) | PR/handoff gate — issue AC, smells, done-checklist, policy |
| [storybook](.agents/skills/storybook/) | Offline-first catalog, mock vs live tiers, `.stories.tsx` |
| [accessibility](.agents/skills/accessibility/) | WCAG 2.x UI compliance |
| [git-workflow](.agents/skills/git-workflow/) | Branching, commits, PRs, CI gates |

## Code quality

Load [clean-code](.agents/skills/clean-code/) when building or refactoring; [code-review](.agents/skills/code-review/) before handoff or PR review. Scan [smells.md](.agents/skills/clean-code/smells.md) on touched files. Domain skills override when more specific.

## Multitask

Parallel agents: plan with [plan-feature](.agents/skills/plan-feature/), split per [developer/multitask.md](.agents/skills/developer/multitask.md), cross-chunk review via [developer/multitask-verifier.md](.agents/skills/developer/multitask-verifier.md), verify issue AC with [verify-issue](.agents/skills/verify-issue/) when scoped to a GitHub issue, then [testing](.agents/skills/testing/) and [done-checklist](.agents/skills/developer/done-checklist.md).
