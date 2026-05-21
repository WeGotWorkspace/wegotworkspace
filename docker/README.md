# Docker dev / CI runtime

**Apache 2.4 + mod_php** (official `php:8.3-apache-bookworm`) — closer to typical shared hosting than nginx + PHP-FPM.

Serves the install shell (`apps/wegotworkspace`) with Laravel from **`packages/api`** via monorepo bind mounts (same path layout as host `pnpm dev:api`).

## Enabled Apache modules

Common on cPanel / Plesk / generic shared Apache:

`rewrite`, `headers`, `env`, `mime`, `dir`, `alias`, `negotiation`, `setenvif`, `deflate`, `filter`, `authz_core`, `authz_host`, `auth_basic`, `ssl`

`.htaccess` in the install root uses `mod_rewrite` and `mod_mime` (same as production).

## Quick start

```bash
composer --working-dir packages/api install
pnpm --filter @wgw/apps run build:dev
docker compose -f compose.dev.yml up -d --build
```

- API: http://127.0.0.1:9080 (`WGW_DOCKER_HTTP_PORT` to override)
- Health: http://127.0.0.1:9080/api/v1/health

**Day-to-day UI:** Storybook/Vite on the host (`pnpm dev` or `pnpm dev:ui`), proxy `/api/v1` to `http://127.0.0.1:9080`.

**Stop:** `docker compose -f compose.dev.yml down`

## Optional Mailhog

```bash
docker compose -f compose.dev.yml --profile mail up -d
```

SMTP `localhost:1025`, UI http://127.0.0.1:8025.

## CI / Playwright

```bash
pnpm test:api-e2e:docker
```

Uses `compose.ci.yml` (includes this file).

## Layout inside the container

| Host path | Container path |
|-----------|----------------|
| `apps/wegotworkspace` | `/var/www/install` (Apache `DocumentRoot`) |
| `packages/api` | `/var/www/packages/api` |
| `packages/apps` | `/var/www/packages/apps` (read-only) |

`WgwAppBootstrap` resolves `dirname(/var/www/install, 2)/packages/api` → `/var/www/packages/api`.

First boot copies `wgw-config.sample.php` → `wgw-config.php` when missing; runs `composer install` when `vendor/` is absent.
