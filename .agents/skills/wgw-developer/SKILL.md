---
name: wgw-developer
description: Context-loading guide for the WeGotWorkspace monorepo. Covers dev layout, skill routing, and critical constraints. Use when starting work, onboarding, or unsure which domain skill to load.
---

# WeGotWorkspace Developer

Context-loading skill for AI agents and developers working in the WeGotWorkspace monorepo. Loads relevant documentation based on your task.

## Quick decision matrix

**What are you doing?** → **Load this skill:**

| Task | Skill | Key docs |
|------|-------|----------|
| API / Laravel / REST / WebDAV | [wgw-api](../wgw-api/SKILL.md) | [layers.md](../wgw-api/layers.md), [testing.md](../wgw-api/testing.md) |
| UI primitives / CSS / styling | [wgw-apps-ui](../wgw-apps-ui/SKILL.md) | — |
| Workspace shell / *App / *Workspace | [wgw-workspace](../wgw-workspace/SKILL.md) | [feature-blueprint.md](../wgw-workspace/feature-blueprint.md) |
| Git commits / staging | [git-workflow](../git-workflow/SKILL.md) | — |

## Dev layout

- **Default:** `pnpm docker:up` + `pnpm dev:ui` → Storybook http://127.0.0.1:6006, API http://127.0.0.1:9080 — see `docs/dev-layout.md`
- **Edit:** `packages/api` (Laravel), `packages/apps` (UI → `dist/`); install shell `apps/wegotworkspace` is config/data only
- **Env:** root `.env` (tooling), `packages/api/.env` (Laravel) — `docs/env.md`
- **Release-like tree:** `pnpm dev:preview` or `pnpm build` syncs into `apps/wegotworkspace/packages/`
- **Docker / HTTPS / WebDAV:** `docker/README.md`; API e2e (local): `pnpm test:api-e2e:docker`

## Critical warnings

1. **API is greenfield Laravel** — no legacy PHP in tree; reimplement from OpenAPI → [wgw-api](../wgw-api/SKILL.md)
2. **No auto-commits** — only commit when the user asks → [git-workflow](../git-workflow/SKILL.md)
3. **UI styling via CSS variables** — primitives stay context-agnostic → [wgw-apps-ui](../wgw-apps-ui/SKILL.md)
4. **File I/O via Flysystem** — single storage layer for REST and WebDAV → [storage-flysystem.md](../wgw-api/storage-flysystem.md)

## When NOT to use this skill

- Deep API work: load **wgw-api** directly
- UI refactoring: load **wgw-apps-ui** or **wgw-workspace** directly
- Simple one-off questions: ask directly without loading skills

## Related documentation

- Root: [AGENTS.md](../../../AGENTS.md)
- API done gate: `packages/api/docs/api-done-gate.md`
- OpenAPI contract: `packages/api/openapi/openapi.json`
