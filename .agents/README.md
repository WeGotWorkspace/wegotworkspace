# Agent Skills (WeGotWorkspace)

Tool-agnostic agent skills following the [Agent Skills](https://agentskills.io/specification) open standard. Compatible with Cursor, Claude Code, Codex, Copilot, and other skills-aware agents.

## Skills index

| Skill | Purpose |
|-------|---------|
| [wgw-developer](skills/wgw-developer/) | Monorepo entry point — dev layout, skill routing |
| [wgw-api](skills/wgw-api/) | Greenfield Laravel API — OpenAPI, layers, auth, storage, SabreDAV |
| [wgw-apps-ui](skills/wgw-apps-ui/) | UI primitives, CSS variables, responsive action surfaces |
| [wgw-workspace](skills/wgw-workspace/) | Workspace shell, *App/*Workspace blueprint |
| [git-workflow](skills/git-workflow/) | No auto-commit, Conventional Commits |

## Usage

Agents discover skills by `name` and `description` at startup, then load full `SKILL.md` instructions when a task matches. Path-scoped skills (`paths` frontmatter) activate when editing matching files.

For repo-wide bootstrap and non-negotiable constraints, see [AGENTS.md](../AGENTS.md) at the repository root.
