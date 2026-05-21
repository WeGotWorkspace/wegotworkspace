# Development layout (source vs install runtime)

## Three layers

| Path | What it is | Built? |
|------|------------|--------|
| `packages/api` | Laravel **API app** (REST, WebDAV, UI kernels) | `composer install` only |
| `packages/apps` | UI **source** (Vite → `packages/apps/dist/`) | `vite build` / watch |
| `apps/wegotworkspace` | **Install shell** — `index.php`, `wgw-config.php`, `wgw-content/` | No code copies in day-to-day dev |

Production releases still assemble a self-contained tree under `apps/wegotworkspace/packages/*` via `pnpm build` / `pnpm release`. That sync is for shipping, not for editing.

## Root `.env`

Repo scripts use `tools/with-root-env.sh` to load the root `.env` (optional). That supports shell-style values (for example `$(cat ~/.ssh/key.pem)`), which plain dotenv loaders do not expand.

## Default dev (`pnpm dev`)

1. **`dev:bootstrap`** — one Vite build into `packages/apps/dist` (no copy into `apps/wegotworkspace`).
2. **Watch** — rebuild `packages/apps/dist` on change; OpenAPI typegen watch on `@wgw/api`.
3. **No API file sync** — PHP loads `packages/api` directly (`WgwAppBootstrap` prefers the monorepo path when `vendor/` exists).

Serve the backend in a second terminal:

```bash
pnpm dev:api
```

Uses `apps/wegotworkspace` as docroot (`index.php` router) but boots Laravel from **`packages/api`**. UI static files are read from **`packages/apps/*/dist`** in the repo (`AppPaths` checks monorepo paths first).

Storybook (port 6006) proxies `/api/v1` to `http://127.0.0.1:9080` by default.

## Production-like install tree (`pnpm dev:preview`)

Copies `packages/api` and UI `dist/` into `apps/wegotworkspace/packages/` and watches with runtime sync — same layout as a release ZIP. Use when testing Apache/macOS preview or install-path edge cases.

## macOS Apache (`pnpm preview:macos`)

Optional; still supported. Prefer `pnpm dev:api` + Storybook/Vite for daily work.

## Mental model

- **`packages/*`** = where you edit.
- **`apps/wegotworkspace`** = where the product is *installed* (config + data + front door), not a second API codebase.
