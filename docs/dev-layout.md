# Development layout (source vs install runtime)

## Three layers

| Path | What it is | Built? |
|------|------------|--------|
| `packages/api` | Laravel **API app** (REST, WebDAV, UI kernels) | `composer install` only |
| `packages/apps` | UI **source** (Vite → `packages/apps/dist/`) | `vite build` / watch |
| `apps/wegotworkspace` | **Install shell** — `index.php`, `wgw-config.php`, `wgw-content/` | No code copies in day-to-day dev |

Production releases still assemble a self-contained tree under `apps/wegotworkspace/packages/*` via `pnpm build` / `pnpm release`. That sync is for shipping, not for editing.

## Default dev (Docker + UI)

```bash
pnpm docker:up
pnpm dev:ui
```

- API: Apache in Docker → **http://127.0.0.1:9080** (health, Storybook proxy target)
- UI: Storybook **http://127.0.0.1:6006** with Vite watch into `packages/apps/dist`
- PHP loads **`packages/api`** directly; static UI from **`packages/apps/*/dist`** (`WgwAppBootstrap` / `AppPaths`)

HTTPS / WebDAV hostname: [`docker/README.md`](../docker/README.md).

## Host PHP instead of Docker

```bash
pnpm dev          # API :9080 + UI + Storybook + OpenAPI typegen watch
pnpm dev:api      # API only
pnpm dev:ui       # UI only (start API separately)
```

## Environment files

See [`env.md`](env.md) — root `.env` (tooling), `packages/api/.env` (Laravel), `.env.local` (Storybook).

## Production-like install tree (`pnpm dev:preview`)

Copies `packages/api` and UI `dist/` into `apps/wegotworkspace/packages/` and watches with runtime sync — same layout as a release ZIP. Use when testing install-path or Apache edge cases only.

## Mental model

- **`packages/*`** = where you edit.
- **`apps/wegotworkspace`** = install shell (config + data + front door), not a second API codebase.
