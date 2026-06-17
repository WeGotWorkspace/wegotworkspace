# Development layout (source vs install runtime)

## Three layers

| Path | What it is | Built? |
|------|------------|--------|
| `packages/api` | Laravel **API app** (REST, WebDAV, UI kernels) | `composer install` only |
| `packages/apps` | UI **source** (Vite dev / build → `packages/apps/dist/`) | `vite dev` or `vite build` |
| `apps/wegotworkspace` | **Install shell** — `index.php`, `wgw-config.php`, `wgw-content/` | No code copies in day-to-day dev |

Production releases still assemble a self-contained tree under `apps/wegotworkspace/packages/*` via `pnpm build` / `pnpm release`. That sync is for shipping, not for editing.

## Default dev (Docker-free)

```bash
pnpm dev
```

| Service | URL | Notes |
|---------|-----|-------|
| Full app (HMR) | http://127.0.0.1:5173 | Vite dev server; proxies `/api/v1` → `:9080` |
| Storybook | http://127.0.0.1:6006 | Component catalog; same API proxy |
| API (host PHP) | http://127.0.0.1:9080 | Health: `/api/v1/health` |

`pnpm dev` starts all three in parallel via turbo. OpenAPI typegen watch runs alongside.

## Docker API (optional)

```bash
pnpm docker:up
pnpm dev          # UI only needs API on :9080; host PHP is not started if you skip `pnpm dev:api`
```

Or run Storybook alone: `pnpm dev:storybook`.

HTTPS / WebDAV hostname: [`docker/README.md`](../docker/README.md).

## Host PHP instead of Docker

```bash
pnpm dev          # API :9080 + Vite app :5173 + Storybook :6006 + typegen watch
pnpm dev:api      # API only
pnpm dev:storybook # Storybook only
pnpm dev:ui       # alias for `pnpm dev`
```

## Preview (built UI, no HMR)

```bash
pnpm preview
```

Builds apps (`vite build`), starts host PHP API on `:9080`, and serves the bundle via `vite preview` on **http://127.0.0.1:4173** with the same `/api/v1` proxy.

`preview:bootstrap` runs `php artisan wgw:dev-install` so login works without the web installer: it writes `wgw-config.php`, migrates `wgw-content/db.sqlite`, seeds the `admin` user (password `storybook-dev`, overridable via `WGW_DEV_USERNAME` / `WGW_DEV_PASSWORD`), and creates JWT keys under `apps/wegotworkspace/wgw-content/keys/` (gitignored). To regenerate keys only:

```bash
php packages/api/artisan wgw:jwt-keys
```

To re-run the full dev bootstrap manually:

```bash
php packages/api/artisan wgw:dev-install
```

See [`packages/api/docs/api-auth.md`](../packages/api/docs/api-auth.md) for env overrides (`WGW_API_JWT_*`).

## Environment files

See [`env.md`](env.md) — root `.env` (tooling), `packages/api/.env` (Laravel), `.env.local` (Vite / Storybook proxy).

## UI smoke e2e (Playwright, optional)

Phase 1 loads mock-tier Storybook stories — no live API required:

```bash
pnpm test:apps-e2e
```

Starts Storybook on **:6006** (or reuses `pnpm dev`). Specs live in `packages/apps/e2e/`. With Storybook already running:

```bash
WGW_APPS_E2E_NO_SERVER=1 pnpm test:apps-e2e
```

Not part of `pnpm test:apps-done-gate` or CI yet (see [apps-done-gate.md](../.agents/skills/testing/apps-done-gate.md)).

## Mental model

- **`packages/*`** = where you edit.
- **`apps/wegotworkspace`** = install shell (config + data + front door), not a second API codebase.
