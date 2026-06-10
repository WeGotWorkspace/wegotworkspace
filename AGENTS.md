# Agent instructions (WeGotWorkspace)

## Non-negotiables

**API greenfield:** Work under `packages/api/` is a new Laravel app matching OpenAPI — no legacy PHP in tree. Do not restore `packages/api/src/`, `*Kernel`, `MailApi`, or dual autoload. Full guidance: [`.agents/skills/api/`](.agents/skills/api/).

**Git:** Do not `git commit` or open PRs unless the user explicitly asks. [`.agents/skills/git-workflow/`](.agents/skills/git-workflow/).

## Start here

Load **[developer](.agents/skills/developer/)** for dev layout, skill routing, multitask handoffs, and links to package-specific depth. **Policy vs CI:** [.agents/POLICY.md](.agents/POLICY.md). **Done verification:** [developer/done-checklist.md](.agents/skills/developer/done-checklist.md).

## Skills index

Agent skills live in [`.agents/skills/`](.agents/skills/) (tool-agnostic [Agent Skills](https://agentskills.io/) format). **Naming:** unprefixed directory names only — no `wgw-` skill prefixes.

| Skill | When to use |
|-------|-------------|
| [developer](.agents/skills/developer/) | Starting work, onboarding, skill routing, multitask |
| [dev-environment](.agents/skills/dev-environment/) | Docker, ports, Storybook proxy, troubleshooting |
| [api](.agents/skills/api/) | `packages/api` — REST, auth, storage, WebDAV, tests |
| [meet](.agents/skills/meet/) | Meet UI, RTC, room signaling |
| [apps-ui](.agents/skills/apps-ui/) | UI primitives, CSS variables, components, TypeScript |
| [workspace](.agents/skills/workspace/) | *App, *Workspace, workspace shell, feature blueprint |
| [plan-feature](.agents/skills/plan-feature/) | Scoping features, parallel chunk plans |
| [testing](.agents/skills/testing/) | PHPUnit, Vitest, e2e, done-when checklists |
| [document](.agents/skills/document/) | README, API docs, dev-layout updates |
| [clean-code](.agents/skills/clean-code/) | Code quality guardrails (Robert C. Martin series) |
| [storybook](.agents/skills/storybook/) | Offline-first catalog, mock vs live tiers, `.stories.tsx` |
| [accessibility](.agents/skills/accessibility/) | WCAG 2.x UI compliance |
| [git-workflow](.agents/skills/git-workflow/) | Branching, commits, PRs, CI gates |

## Code quality

Load [clean-code](.agents/skills/clean-code/) when building, reviewing, or refactoring. Domain skills override when more specific.

## Multitask

Parallel agents: plan with [plan-feature](.agents/skills/plan-feature/), split per [developer/multitask.md](.agents/skills/developer/multitask.md), verify with [testing](.agents/skills/testing/).
