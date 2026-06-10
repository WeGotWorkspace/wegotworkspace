---
name: developer
description: Context-loading guide for the WeGotWorkspace monorepo. Covers dev layout, skill routing, and critical constraints. Use when starting work, onboarding, or unsure which skill to load.
---

# WeGotWorkspace Developer

Context-loading skill for AI agents and developers working in the WeGotWorkspace monorepo. Loads relevant documentation based on your task.

## Quick decision matrix

**What are you doing?** → **Load this skill:**

| Task | Skill | Key docs |
|------|-------|----------|
| Starting work / skill routing | `developer` | [multitask.md](multitask.md) |
| API / Laravel / REST / WebDAV | [api](../api/SKILL.md) | [layers.md](../api/layers.md), [testing.md](../api/testing.md) |
| UI primitives / CSS / styling | [apps-ui](../apps-ui/SKILL.md) | [components.md](../apps-ui/components.md), [typescript.md](../apps-ui/typescript.md) |
| Workspace shell / *App / *Workspace | [workspace](../workspace/SKILL.md) | [feature-blueprint.md](../workspace/feature-blueprint.md) |
| Planning a feature | [plan-feature](../plan-feature/SKILL.md) | — |
| Writing or running tests | [testing](../testing/SKILL.md) | [test-first.md](../testing/test-first.md), [ui-architecture.md](../testing/ui-architecture.md) |
| Writing or updating docs | [document](../document/SKILL.md) | — |
| Branching / commits / PRs | [git-workflow](../git-workflow/SKILL.md) | [branches.md](../git-workflow/branches.md), [pull-requests.md](../git-workflow/pull-requests.md) |
| Code quality / review / refactor | [clean-code](../clean-code/SKILL.md) | [smells.md](../clean-code/smells.md) |
| Storybook stories | [storybook](../storybook/SKILL.md) | [coverage.md](../storybook/coverage.md) |
| Accessibility / WCAG | [accessibility](../accessibility/SKILL.md) | [wcag.md](../accessibility/wcag.md) |

## Dev layout

- **Default:** `pnpm docker:up` + `pnpm dev:ui` → Storybook http://127.0.0.1:6006, API http://127.0.0.1:9080 — see `docs/dev-layout.md`
- **Edit:** `packages/api` (Laravel), `packages/apps` (UI → `dist/`); install shell `apps/wegotworkspace` is config/data only
- **Env:** root `.env` (tooling), `packages/api/.env` (Laravel) — `docs/env.md`
- **Release-like tree:** `pnpm dev:preview` or `pnpm build` syncs into `apps/wegotworkspace/packages/`
- **Docker / HTTPS / WebDAV:** `docker/README.md`; API e2e (local): `pnpm test:api-e2e:docker`

## Critical warnings

1. **API is greenfield Laravel** — no legacy PHP in tree; reimplement from OpenAPI → [api](../api/SKILL.md)
2. **No auto-commits** — only commit when the user asks → [git-workflow](../git-workflow/SKILL.md)
3. **UI styling via CSS variables** — primitives stay context-agnostic → [apps-ui](../apps-ui/SKILL.md)
4. **File I/O via Flysystem** — single storage layer for REST and WebDAV → [storage-flysystem.md](../api/storage-flysystem.md)

## Multitask

When running parallel agents, see [multitask.md](multitask.md) for chunk splitting, handoffs, and post-parallel verification.

## When NOT to use this skill

- Deep API work: load **api** directly
- UI refactoring: load **apps-ui** or **workspace** directly
- Simple one-off questions: ask directly without loading skills

## Related documentation

- Root: [AGENTS.md](../../../AGENTS.md)
- API done gate: `packages/api/docs/api-done-gate.md`
- OpenAPI contract: `packages/api/openapi/openapi.json`
