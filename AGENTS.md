# Agent instructions (WeGotWorkspace)

## API greenfield (read first)

When working on **`packages/api`** REST or a new Laravel API:

1. Read **`.cursor/rules/api-greenfield.mdc`** (always applied).
2. Use **`packages/api/openapi/openapi.json`** as the only in-tree API reference — there is **no** legacy PHP to copy.
3. Before calling API work done, see **`packages/api/docs/api-done-gate.md`**.

**Contract parity ≠ code parity.** Match OpenAPI via feature tests; implement logic in new Laravel layers. Legacy `packages/api/src/` was removed from the workspace on purpose.

**API done gate:** `pnpm test:api-done-gate` / `composer done-gate` in `packages/api` — see `packages/api/docs/api-done-gate.md`.

**Meet signaling:** Laravel `VoiceSignalingService` only — see `packages/api/docs/voice-migration.md`. Do not restore full `packages/api/src/` or `legacy/Voice/`.

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

File I/O for drive, notes, office, and WebDAV **files** uses Laravel **Flysystem** (`WgwStorage`). See `.cursor/rules/api-storage-flysystem.mdc`.

## Commits

Do not `git commit` unless the user asks. See `.cursor/rules/no-auto-git-commit.mdc`.
