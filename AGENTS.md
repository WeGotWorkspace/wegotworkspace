# Agent instructions (WeGotWorkspace)

## Non-negotiables

**API greenfield:** Work under `packages/api/` is a new Laravel app matching OpenAPI — no legacy PHP in tree. Do not restore `packages/api/src/`, `*Kernel`, `MailApi`, or dual autoload. Reimplement from `packages/api/openapi/openapi.json` + feature tests. Full guidance: [`.agents/skills/wgw-api/`](.agents/skills/wgw-api/).

**Git:** Do not `git commit` unless the user explicitly asks. When committing, use Conventional Commits. See [`.agents/skills/git-workflow/`](.agents/skills/git-workflow/).

## Skills index

Agent skills live in [`.agents/skills/`](.agents/skills/) (tool-agnostic [Agent Skills](https://agentskills.io/) format):

| Skill | When to use |
|-------|-------------|
| [wgw-developer](.agents/skills/wgw-developer/) | Starting work, onboarding, skill routing |
| [wgw-api](.agents/skills/wgw-api/) | `packages/api` — REST, auth, storage, WebDAV, tests |
| [wgw-apps-ui](.agents/skills/wgw-apps-ui/) | UI primitives, CSS variables, action surfaces |
| [wgw-workspace](.agents/skills/wgw-workspace/) | *App, *Workspace, workspace shell, feature blueprint |
| [git-workflow](.agents/skills/git-workflow/) | Staging, commits, commit message format |

## API (read first for `packages/api` work)

1. Load **[wgw-api](.agents/skills/wgw-api/)** skill.
2. Use **`packages/api/openapi/openapi.json`** as the only in-tree API reference — there is **no** legacy PHP to copy.
3. Before calling API work done, see **`packages/api/docs/api-done-gate.md`**.

**Contract parity ≠ code parity.** Match OpenAPI via feature tests; implement logic in new Laravel layers.

**API done gate:** `pnpm test:api-done-gate` / `composer done-gate` in `packages/api` — see `packages/api/docs/api-done-gate.md`.

**Meet signaling:** Laravel `MeetSignalingService` only — see `packages/api/docs/meet-signaling.md`. Do not restore full `packages/api/src/` or `legacy/Voice/`.

## `packages/api` layout

| Present | Absent (do not restore) |
|---------|-------------------------|
| `openapi/`, `scripts/` (typegen), `docs/api-done-gate.md`, Laravel `app/` | `src/`, `legacy/`, `MailApi`, `ApiKernel`, `DomainRouteService`, dual `App\` autoload |

## Dev layout

- **Default:** `pnpm docker:up` + `pnpm dev:ui` → Storybook http://127.0.0.1:6006, API http://127.0.0.1:9080 — see `docs/dev-layout.md`
- **Edit:** `packages/api` (Laravel), `packages/apps` (UI → `dist/`); install shell `apps/wegotworkspace` is config/data only
- **Env:** root `.env` (tooling), `packages/api/.env` (Laravel) — `docs/env.md`
- **Release-like tree:** `pnpm dev:preview` or `pnpm build` syncs into `apps/wegotworkspace/packages/`
- **Docker / HTTPS / WebDAV:** `docker/README.md`; API e2e (local): `pnpm test:api-e2e:docker`

## HTTP routing

- **REST:** `routes/api.php` (`/api/v1/*`)
- **UI + WebDAV:** `routes/web.php` → `WgwFrontController` (`UiStaticFront` then `SabreWebdavFront`)
- **Install front door:** `apps/wegotworkspace/index.php` → `packages/api/public/index.php` only

## Storage (when implementing)

File I/O for drive, notes, plugins, and WebDAV **files** uses Laravel **Flysystem** (`WgwStorage`). See [`.agents/skills/wgw-api/storage-flysystem.md`](.agents/skills/wgw-api/storage-flysystem.md).
