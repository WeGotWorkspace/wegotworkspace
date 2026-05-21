# Agent instructions (WeGotWorkspace)

## API greenfield (read first)

When working on **`packages/api`** REST or a new Laravel API:

1. Read **`.cursor/rules/api-greenfield.mdc`** (always applied).
2. Follow **`packages/api/docs/greenfield-plan.md`**.
3. Use **`packages/api/openapi/openapi.json`** as the only in-tree API reference — there is **no** legacy PHP to copy.

**Contract parity ≠ code parity.** Match OpenAPI via feature tests; implement logic in new Laravel layers. Legacy `packages/api/src/` was removed from the workspace on purpose.

**Meet signaling:** Laravel `VoiceSignalingService` only — see `packages/api/docs/voice-migration.md`. Do not restore full `packages/api/src/` or `legacy/Voice/`.

## `packages/api` layout

| Present | Absent (do not restore) |
|---------|-------------------------|
| `openapi/`, `scripts/` (typegen), `docs/greenfield-plan.md`, `app/Services/Voice/` | `src/`, `legacy/`, `*Kernel`, `MailApi`, `ApiKernel`, dual `App\` autoload |

PHP tests and `composer.json` appear only **after** Phase 0 scaffold in the greenfield plan.

## Dev layout

- **Edit:** `packages/api` (Laravel app), `packages/apps` (UI → `dist/`)
- **Install shell:** `apps/wegotworkspace` (config, data, `index.php`) — not a second API codebase; see `docs/dev-layout.md`
- **`pnpm dev`** does not sync into `apps/wegotworkspace/packages/`; use **`pnpm dev:preview`** for release-like copies
- **Docker API:** `compose.dev.yml` / `pnpm docker:up` — see `docker/README.md`; CI e2e uses `pnpm test:api-e2e:docker`

## HTTP routing

- **REST:** `routes/api.php` (`/api/v1/*`)
- **UI + WebDAV:** `routes/web.php` → `WgwFrontController` (`UiFrontKernel` then `SabreKernel`)
- **Install front door:** `apps/wegotworkspace/index.php` → `packages/api/public/index.php` only

## Storage (when implementing)

File I/O for drive, notes, office, and WebDAV **files** uses Laravel **Flysystem** (`WgwStorage`). See `.cursor/rules/api-storage-flysystem.mdc`.

## Commits

Do not `git commit` unless the user asks. See `.cursor/rules/no-auto-git-commit.mdc`.
