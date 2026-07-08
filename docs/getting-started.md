# Getting started with WeGotWorkspace

WeGotWorkspace is a self-hosted office platform (files, mail, notes, contacts, tasks, meet, and more). Pick the install path that matches how you want to run it.

## Choose your path

| I want to… | Start here |
| --- | --- |
| **Install on shared Apache/PHP hosting** (cPanel, Plesk, SFTP upload) | [INSTALL.md](../INSTALL.md) — download the release ZIP from [GitHub Releases](https://github.com/WeGotWorkspace/wegotworkspace/releases) |
| **Install with Docker** (self-host on a VPS or homelab) | [install-docker.md](install-docker.md) — `compose.install.yml` + GHCR image |
| **Develop or contribute** (clone the monorepo, HMR, tests) | [dev-layout.md](dev-layout.md) — `pnpm dev` |

All production installs (ZIP or Docker) use the **same runtime tree**: `index.php`, `bootstrap/`, `packages/api/`, built `packages/apps/*/dist/`, and `wgw-config.sample.php`. The web installer at `/install/` is identical regardless of delivery channel.

## Why three top-level folders?

If you cloned the repository for development, the layout can look redundant. In practice:

| Path | Role |
| --- | --- |
| `packages/api` | Laravel API source (REST, WebDAV, CalDAV, CardDAV) |
| `packages/apps` | UI source (Vite/React modules — edit here during dev) |
| `apps/wegotworkspace` | **Runtime / install shell** — assembled by `pnpm build` for releases; not edited during normal development |

Day-to-day development runs Vite HMR from `packages/apps` and a host or Docker PHP API. The install shell is synced only for preview and release packaging.

## After install

1. Open `/install/` and complete the wizard (requirements, database, first account).
2. Sign in and connect WebDAV/CalDAV clients to your site URL.
3. Install optional plugins via **Admin → Plugins** ([plugins.md](plugins.md)).

## Updates

- **ZIP installs:** Replace files in place per [INSTALL.md](../INSTALL.md); `.env`, `wgw-content/`, and user data are preserved.
- **Docker installs:** Pull a new image tag and `docker compose up -d`; named volumes keep `wgw-content/` and database data. See [install-docker.md](install-docker.md#updates-and-backups).

## Need help?

- Environment variables (contributor dev): [env.md](env.md)
- Docker dev stack (not production install): [../docker/README.md](../docker/README.md)
- Bug reports: [GitHub Issues](https://github.com/WeGotWorkspace/wegotworkspace/issues)
