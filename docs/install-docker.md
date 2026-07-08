# Install WeGotWorkspace with Docker

Production Docker install runs the **same document-root layout** as the release ZIP ([INSTALL.md](../INSTALL.md)). You do not need Node, pnpm, or a git checkout on the host.

For monorepo development (bind mounts, Vite HMR), use [dev-layout.md](dev-layout.md) and [docker/README.md](../docker/README.md) instead — that is **`compose.dev.yml`**, not this stack.

## Requirements

- Docker Engine 24+ and Docker Compose v2
- ~2 GB disk for the image; more for uploads and database volume

## Quick start (recommended)

One command — no git clone, no `chmod`, no separate start step:

```bash
curl -fsSL https://github.com/WeGotWorkspace/wegotworkspace/releases/latest/download/install | sh
```

This creates `./wegotworkspace/` in the current directory (override with `WGW_INSTALL_DIR`), downloads the release `docker-compose.yml` and `.env`, pulls the image, starts the stack, and prints the installer URL when healthy.

Optional flags (pipe-friendly):

```bash
WGW_HTTP_PORT=9090 curl -fsSL .../install | sh
curl -fsSL .../install | sh -s -- --sqlite
curl -fsSL .../install | sh -s -- --version 1.2.0
```

Then open:

```text
http://localhost:8080/install/
```

Default host port is **8080** (`WGW_HTTP_PORT`).

### MySQL wizard defaults

When using the default MySQL stack (`COMPOSE_PROFILES=mysql`), use these in the installer:

| Field | Value |
| --- | --- |
| Host | `db` |
| Port | `3306` |
| Database / user / password | `wgw` (match `MARIADB_*` in `wegotworkspace/.env`) |

## Lifecycle commands

After the first install, use the same script from `wegotworkspace/` (or re-download `setup.sh` from GitHub Releases):

```bash
cd wegotworkspace
bash setup.sh start          # after stop
bash setup.sh stop
bash setup.sh restart
bash setup.sh logs
bash setup.sh backup
bash setup.sh upgrade 1.2.0  # backup → pull → migrator → web
```

Upgrade from anywhere (re-downloads assets into an existing install dir):

```bash
curl -fsSL .../install | sh -s -- --upgrade 1.2.0
```

Run `bash setup.sh --help` for the full command list.

## SQLite only

```bash
curl -fsSL .../install | sh -s -- --sqlite
```

Or edit `wegotworkspace/.env`:

```bash
COMPOSE_PROFILES=sqlite
WGW_WAIT_FOR_DB=0
WGW_DB_HOST=
```

In the installer, choose **SQLite**. Data lives under the `wgw-content` volume.

## Contributor path (repo checkout)

For local image builds and development of the install stack itself:

```bash
git clone https://github.com/WeGotWorkspace/wegotworkspace.git
cd wegotworkspace/docker/install
cp .env.example .env
docker compose up -d --build
open http://localhost:8080/install/
```

From a repo checkout you can also run `pnpm docker:install:up` (and `docker:install:down` / `docker:install:logs`) at the monorepo root after copying `docker/install/.env.example` to `docker/install/.env`.

`docker/install/docker-compose.yml` includes a `build:` stanza for contributors. Release bundles ship a pull-only `docker-compose.yml` with no local build.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `COMPOSE_PROFILES` | `mysql` | `mysql` = web + MariaDB; `sqlite` = web only |
| `WGW_IMAGE` | pinned at install time | GHCR image tag |
| `WGW_HTTP_PORT` | `8080` | Host port mapped to container HTTP :80 |
| `WGW_WAIT_FOR_DB` | `1` | Entrypoint/migrator wait for MySQL before proceeding |
| `WGW_DB_HOST` | `db` | MySQL hostname (Compose service name) |
| `WGW_DB_PORT` | `3306` | MySQL port |
| `WGW_DB_USERNAME` | `wgw` | Credentials passed to DB wait probe |
| `WGW_DB_PASSWORD` | `wgw` | Credentials passed to DB wait probe |
| `MARIADB_ROOT_PASSWORD` | `wgw-root` | MariaDB root password |
| `MARIADB_DATABASE` | `wgw` | Database created on first boot |
| `MARIADB_USER` | `wgw` | Application database user |
| `MARIADB_PASSWORD` | `wgw` | Application database password |

Change default passwords before exposing the stack to a network.

## What persists

Named volumes (survive `docker compose down` and image updates):

| Volume | Mount | Contents |
| --- | --- | --- |
| `wgw-content` | `/var/www/html/wgw-content` | SQLite DB (if used), uploads, JWT keys, `.installed` lock |
| `wgw-api-storage` | `/var/www/html/packages/api/storage` | Laravel storage, sessions, logs |
| `wgw-install-config` | `/wgw-config-vol` | Install config (`wgw-config.php`, `api.env`) — **survives container recreate** |
| `wgw-db` | MariaDB data dir | MySQL database files (profile `mysql`) |

Application code in the image is replaced on update; volumes are **not** removed unless you run `docker compose down -v`.

## Boot sequence

Each `docker compose up` runs a **one-shot migrator** before the web container starts:

1. **Migrator** ([wgw-install-migrate.sh](../docker/install/wgw-install-migrate.sh)): waits for MySQL (if enabled), then:
   - Seeds [wgw-install-seed-config.sh](../docker/install/wgw-install-seed-config.sh) into the `wgw-install-config` volume (`wgw-config.php`, `api.env`).
   - **Fresh install** (no `wgw-content/.installed`): skips schema migration — the web wizard runs initial migrations.
   - **Existing install**: runs `php artisan wgw:schema-migrate` (same as ZIP in-place updates).
2. **Web** entrypoint ([docker-entrypoint.sh](../docker/install/docker-entrypoint.sh)): symlinks config from `/wgw-config-vol`, ensures permissions, runs `key:generate` when needed, starts Apache.

Failed migrations block the web service from starting, preventing a half-upgraded state.

## Updates and backups

### Upgrade to a new release

**Recommended** — use the lifecycle script (includes backup):

```bash
cd wegotworkspace
bash setup.sh upgrade 1.2.0
```

Or re-run the install script with `--upgrade`:

```bash
curl -fsSL .../install | sh -s -- --upgrade 1.2.0
```

Manual equivalent:

```bash
# Pin the new tag in wegotworkspace/.env
WGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:1.2.0

docker compose -f wegotworkspace/docker-compose.yml --env-file wegotworkspace/.env pull
docker compose -f wegotworkspace/docker-compose.yml --env-file wegotworkspace/.env up -d
```

The migrator runs automatically before Apache serves traffic.

### Do not use Admin → Updates on Docker

The admin web updater ([UpdateRunner](../packages/api/app/Services/Update/UpdateRunner.php)) replaces files inside the container filesystem. Docker installs should **only** upgrade by pulling a new image tag. The admin updater is for ZIP/Apache hosting installs.

### Backup

```bash
cd wegotworkspace
bash setup.sh backup
```

This archives named volumes and (when using MySQL) dumps the database to `wegotworkspace/backups/<timestamp>/`.

Manual MySQL dump:

```bash
docker compose -f wegotworkspace/docker-compose.yml --env-file wegotworkspace/.env exec db \
  mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" wgw > wgw-backup.sql
```

## Health check

```bash
curl -fsS http://localhost:8080/api/v1/health
# {"status":"ok", ...}
```

Compose and the container `HEALTHCHECK` use the same endpoint.

## Build the image locally

From a git checkout (used when `WGW_IMAGE` is unset or you pass `--build`):

```bash
cd docker/install
cp .env.example .env
docker compose up -d --build
```

The Dockerfile runs `pnpm build` and the release packager — expect several minutes on first build.

## Release assets

Each tagged GitHub Release includes:

| Asset | Purpose |
| --- | --- |
| `install` | One-liner entry for `curl \| sh` |
| `setup.sh` | Same script — lifecycle commands |
| `docker-compose.yml` | Pull-only stack with migrator |
| `env.example` | Release env template (no leading dot — GitHub strips dotted names). Install writes `wegotworkspace/.env.example` and `wegotworkspace/.env` |
| `wgw-docker-install-{version}.tar.gz` | All of the above in one archive |
| GHCR image | `ghcr.io/wegotworkspace/wegotworkspace:{version}` |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/install/` 404 | Container health: `bash setup.sh logs` or `docker compose ps`; wait for `healthy` |
| MySQL connection failed in wizard | `COMPOSE_PROFILES=mysql`, host `db`, credentials match `.env` |
| Port in use | Change `WGW_HTTP_PORT` (default 8080 avoids dev stack :9080) |
| Web won't start after upgrade | Check migrator logs: `docker compose logs migrator` — migration may have failed |
| Config lost after recreate | Ensure `wgw-install-config` volume exists; do not use `docker compose down -v` unless intentional |

## TLS (HTTPS)

Automatic TLS termination is not included in the default stack. Terminate HTTPS on a reverse proxy (Caddy, Traefik, nginx) in front of `WGW_HTTP_PORT`, or use your platform’s load balancer. A dedicated Compose TLS profile may be added later.
