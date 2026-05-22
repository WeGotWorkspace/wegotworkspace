# Docker dev / CI runtime

**Apache 2.4 + mod_php** (official `php:8.3-apache-bookworm`) — closer to typical shared hosting than nginx + PHP-FPM.

Serves the install shell (`apps/wegotworkspace`) with Laravel from **`packages/api`** via monorepo bind mounts (same path layout as host `pnpm dev:api`).

## Enabled Apache modules

Common on cPanel / Plesk / generic shared Apache:

`rewrite`, `headers`, `env`, `mime`, `dir`, `alias`, `negotiation`, `setenvif`, `deflate`, `filter`, `authz_core`, `authz_host`, `auth_basic`, `ssl`

`.htaccess` in the install root uses `mod_rewrite` and `mod_mime` (same as production).

## Quick start (HTTP)

```bash
composer --working-dir packages/api install
pnpm --filter @wgw/apps run build:dev
docker compose -f compose.dev.yml up -d --build
```

- API: http://127.0.0.1:9080 (`WGW_DOCKER_HTTP_PORT` to override)
- Health: http://127.0.0.1:9080/api/v1/health

**Day-to-day UI:** Storybook/Vite on the host (`pnpm dev` or `pnpm dev:ui`), proxy `/api/v1` to `http://127.0.0.1:9080`.

**Stop:** `docker compose -f compose.dev.yml down`

## HTTPS + WebDAV (`wegotworkspace.local`)

WebDAV/CalDAV clients expect a stable hostname and trusted TLS. Use **mkcert** on the host and mount leaf certs into the container.

1. **Stop host Apache** if it still binds 80/443 (e.g. leftover Homebrew `httpd`):

   ```bash
   brew services stop httpd
   ```

2. **Hosts file** (once):

   ```
   127.0.0.1 wegotworkspace.local
   ```

3. **Generate certs** (trusted in macOS Keychain after `mkcert -install`):

   ```bash
   brew install mkcert   # if needed
   pnpm docker:ssl:setup
   ```

4. **Start stack** (maps host **443** → container HTTPS, **80** → HTTP redirect):

   ```bash
   docker compose -f compose.dev.yml up -d --build
   ```

5. Open **https://wegotworkspace.local/** (no port — standard 443).

| Env | Default | Purpose |
|-----|---------|---------|
| `WGW_DEV_DOMAIN` | `wegotworkspace.local` | `ServerName` + cert filenames |
| `WGW_DOCKER_HTTPS_PORT` | `443` | Host port for HTTPS |
| `WGW_DOCKER_HTTP_REDIRECT_PORT` | `80` | Host port for HTTP → HTTPS redirect |
| `WGW_DOCKER_HTTP_PORT` | `9080` | Plain HTTP without `/etc/hosts` (health, curl) |

Certs live in `docker/apache/certs/` (gitignored `*.pem`). Without certs, the entrypoint serves HTTP only on port 80 inside the container.

## Optional Mailhog

```bash
docker compose -f compose.dev.yml --profile mail up -d
```

SMTP `localhost:1025`, UI http://127.0.0.1:8025.

## CI / Playwright

```bash
pnpm test:api-e2e:docker
```

Uses `compose.ci.yml` (includes `compose.dev.yml` — HTTP on `:9080` only). CI does not use `compose.local.yml` (mkcert, host `80`/`443`).

For local HTTPS: `docker compose -f compose.dev.yml -f compose.local.yml up -d --build`.

## Layout inside the container

| Host path | Container path |
|-----------|----------------|
| `apps/wegotworkspace` | `/var/www/install` (Apache `DocumentRoot`) |
| `packages/api` | `/var/www/packages/api` |
| `packages/apps` | `/var/www/packages/apps` (read-only) |
| `docker/apache/certs` | `/etc/apache2/certs` (read-only, optional) |

`WgwAppBootstrap` resolves `dirname(/var/www/install, 2)/packages/api` → `/var/www/packages/api`.

First boot copies `wgw-config.sample.php` → `wgw-config.php` when missing; runs `composer install` when `vendor/` is absent.
