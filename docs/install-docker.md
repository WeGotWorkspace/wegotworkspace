# Install WeGotWorkspace with Docker

Production Docker install runs the **same document-root layout** as the release ZIP ([INSTALL.md](../INSTALL.md)). You do not need Node, pnpm, or a git checkout on the host.

For monorepo development (bind mounts, Vite HMR), use [dev-layout.md](dev-layout.md) and [docker/README.md](../docker/README.md) instead — that is **`compose.dev.yml`**, not this stack.

## Requirements

- Docker Engine 24+ and Docker Compose v2
- ~2 GB disk for the image; more for uploads and database volume

## Quick start (MySQL)

1. Copy the example env file:

   ```bash
   cp .env.install.example .env.install
   ```

2. Start the stack (builds locally if no `WGW_IMAGE` is set):

   ```bash
   docker compose -f compose.install.yml --env-file .env.install up -d
   ```

3. Open the installer:

   ```text
   http://localhost:8080/install/
   ```

   Default host port is **8080** (`WGW_HTTP_PORT`). Change it in `.env.install` if needed.

4. In the wizard:

   - Pass requirements check
   - Choose **MySQL** and use:
     - Host: `db`
     - Port: `3306`
     - Database / user / password: match `MARIADB_*` in `.env.install` (defaults: database `wgw`, user `wgw`, password `wgw`)
   - Create the first admin account

## Quick start (SQLite only)

No MariaDB container — suitable for trials or single-user setups.

```bash
cp .env.install.example .env.install
# Edit .env.install:
#   COMPOSE_PROFILES=sqlite
#   WGW_WAIT_FOR_DB=0
#   WGW_DB_HOST=
docker compose -f compose.install.yml --env-file .env.install up -d
```

In the installer, choose **SQLite**. Data lives under the `wgw-content` volume and `packages/api/storage` volume.

## Pull a release image (no local build)

Tagged releases publish to GitHub Container Registry:

```bash
export WGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:1.0.0
docker compose -f compose.install.yml --env-file .env.install up -d
```

Omit the `build:` step by setting `WGW_IMAGE` — Compose uses the pre-built image from GHCR.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `COMPOSE_PROFILES` | `mysql` | `mysql` = web + MariaDB; `sqlite` = web only |
| `WGW_IMAGE` | `ghcr.io/wegotworkspace/wegotworkspace:latest` | Image to run; set to a version tag to pin releases |
| `WGW_HTTP_PORT` | `8080` | Host port mapped to container HTTP :80 |
| `WGW_WAIT_FOR_DB` | `1` | Entrypoint waits for MySQL before Apache starts |
| `WGW_DB_HOST` | `db` | MySQL hostname (Compose service name) |
| `WGW_DB_PORT` | `3306` | MySQL port |
| `WGW_DB_USERNAME` | `wgw` | Credentials passed to entrypoint wait probe |
| `WGW_DB_PASSWORD` | `wgw` | Credentials passed to entrypoint wait probe |
| `MARIADB_ROOT_PASSWORD` | `wgw-root` | MariaDB root password |
| `MARIADB_DATABASE` | `wgw` | Database created on first boot |
| `MARIADB_USER` | `wgw` | Application database user |
| `MARIADB_PASSWORD` | `wgw` | Application database password |

Change default passwords before exposing the stack to a network.

## What persists

Named volumes (survive `docker compose down` and image updates):

| Volume | Mount | Contents |
| --- | --- | --- |
| `wgw-content` | `/var/www/html/wgw-content` | SQLite DB (if used), uploads, JWT keys |
| `wgw-api-storage` | `/var/www/html/packages/api/storage` | Laravel storage, sessions, logs |
| `wgw-db` | MariaDB data dir | MySQL database files (profile `mysql`) |

Application code in the image is replaced on update; volumes are **not** removed unless you run `docker compose down -v`.

## First boot (inside the container)

The production entrypoint ([docker/install/docker-entrypoint.sh](../docker/install/docker-entrypoint.sh)) mirrors ZIP first-request bootstrap:

- Copies `wgw-config.sample.php` → `wgw-config.php` when missing
- Creates `packages/api/.env` from `.env.example` and generates `APP_KEY`
- Ensures storage directories and permissions
- **Does not** run `composer install` — `vendor/` ships in the release image

## Updates and backups

### Update to a new release

```bash
# Pin the new tag in .env.install
WGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:1.1.0

docker compose -f compose.install.yml --env-file .env.install pull web
docker compose -f compose.install.yml --env-file .env.install up -d
```

Volumes keep your data; only the immutable code layer is replaced (same semantics as in-place ZIP updates).

### Backup

1. **Files:** snapshot the `wgw-content` and `wgw-api-storage` volumes (or `docker run` a temp container to `tar` them).
2. **MySQL:** `docker compose -f compose.install.yml exec db mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" wgw > wgw-backup.sql`

### Restore

Restore volume data and database dump before starting the web service, or follow the same steps as a fresh install with restored volumes.

## Health check

```bash
curl -fsS http://localhost:8080/api/v1/health
# {"status":"ok", ...}
```

Compose and the container `HEALTHCHECK` use the same endpoint.

## Build the image locally

From a git checkout (used when `WGW_IMAGE` is unset or you pass `--build`):

```bash
docker compose -f compose.install.yml --env-file .env.install up -d --build
```

The Dockerfile runs `pnpm build` and the release packager — expect several minutes on first build.

## Advanced: migrate from ZIP to Docker

If you already run a ZIP install, you can mount your extracted tree over `/var/www/html` instead of using the baked image. This is unsupported for casual use but preserves an existing `wgw-content/` and `.env`. Prefer a fresh Docker install + data restore for most cases.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/install/` 404 | Container health: `docker compose -f compose.install.yml ps`; wait for `healthy` |
| MySQL connection failed in wizard | `COMPOSE_PROFILES=mysql`, host `db`, credentials match `.env.install` |
| Port in use | Change `WGW_HTTP_PORT` (default 8080 avoids dev stack :9080) |
| Stale config after update | Volumes preserve `.env`; edit `packages/api/.env` via `docker compose exec web` if needed |

## TLS (HTTPS)

Automatic TLS termination is not included in the default stack. Terminate HTTPS on a reverse proxy (Caddy, Traefik, nginx) in front of `WGW_HTTP_PORT`, or use your platform’s load balancer. A dedicated Compose TLS profile may be added later.
