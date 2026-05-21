# Environment files

Three layers — keep secrets in one place per runtime.

| File | Loaded by | Purpose |
|------|-----------|---------|
| **`.env`** (repo root) | `tools/with-root-env.sh` → pnpm/turbo scripts | Release signing, `VHOST_DOMAIN`, dev-only flags (`WGW_DISABLE_LOGIN_THROTTLE`). Supports shell expansion (`$(cat …)`). |
| **`packages/api/.env`** | Laravel (`public/index.php`) | `APP_KEY`, database, mail, JWT, `WGW_*` API behavior. **This is the API runtime.** |
| **`.env.local`** (repo root) | Vite / Storybook | `VITE_*` and `WGW_PROXY_TARGET` for Live API stories. Copy from `packages/apps/.env.example`. |

## Rules

1. **Do not copy `APP_KEY` or DB credentials into the repo root** — Laravel reads `packages/api/.env` only.
2. **Do not copy Laravel secrets into `.env.local`** — the browser bundle must not see them; use `VITE_WGW_DEV_USERNAME` / `VITE_WGW_DEV_PASSWORD` for Storybook login only.
3. **`pnpm dev` / `pnpm dev:ui`** load root `.env` for scripts; the PHP API still uses `packages/api/.env` whether it runs on the host (`pnpm dev:api`) or in Docker (mount + entrypoint copy on release sync only).
4. After changing **`packages/api/.env`**, restart PHP (or `pnpm docker:up` again) so Laravel picks up changes.

## First-time API env

```bash
cp packages/api/.env.example packages/api/.env
php artisan key:generate --working-dir packages/api   # or set APP_KEY manually
```

Tune `DB_*` / `WGW_*` in that file only.

## Storybook Live API

```bash
cp packages/apps/.env.example .env.local
# set VITE_WGW_DEV_USERNAME / VITE_WGW_DEV_PASSWORD
# WGW_PROXY_TARGET=http://127.0.0.1:9080   # default; match docker:up or dev:api
```

See [`dev-layout.md`](dev-layout.md) for the default dev commands.
