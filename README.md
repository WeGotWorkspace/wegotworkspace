# WeGotWorkspace

WeGotWorkspace is a small self-hosted groupware app powered by SabreDAV.

It includes:
- WebDAV files (`/files/`)
- CalDAV calendars
- CardDAV contacts
- A web installer (`/install/`)
- Optional web apps (`/admin/`, `/drive/`, `/voice/`, `/mail/`, `/notes/`, `/office/`, `/settings/`)

## Install (production)

Use the step-by-step guide in `INSTALL.md`.

That guide is intentionally short and covers:
- Uploading files to your host
- Copying `example.htaccess` to `.htaccess`
- Running the web installer

## Local development

Requirements:
- PHP 8.3+ (host) **or** Docker for the API only
- Node.js 20+
- pnpm 9+
- Docker (optional, recommended for API parity with CI)

From the repository root:

```bash
pnpm install
composer --working-dir packages/api install
pnpm dev
```

`pnpm dev` builds and watches UI into **`packages/apps/dist`**, runs Storybook on port 6006, watches OpenAPI typegen, and starts the PHP API on **`http://127.0.0.1:9080`**. It does **not** copy the API or UI into `apps/wegotworkspace` on every change — see [`docs/dev-layout.md`](docs/dev-layout.md).

For **Live API** stories, copy `packages/apps/.env.example` to **`.env.local` at the repo root**, set `VITE_WGW_DEV_USERNAME` / `VITE_WGW_DEV_PASSWORD`. Storybook proxies `/api/v1` to `http://127.0.0.1:9080` by default.

| Command | Use |
|---------|-----|
| `pnpm dev` | Full stack (API + UI + Storybook) |
| `pnpm dev:api` | PHP backend only (`127.0.0.1:9080`) |
| `pnpm dev:ui` | Storybook + UI watch only |
| `pnpm dev:preview` | Sync into `apps/wegotworkspace/packages/` (release-like tree) |
| `pnpm docker:up` | API in Docker (`127.0.0.1:9080`) — use with `pnpm dev:ui` |
| `pnpm build` | Full production build + runtime sync (CI/release) |
| `pnpm test:api-e2e:docker` | Playwright against Docker stack |

Optional: `pnpm dev:storybook`, `pnpm dev:onlyoffice`.

Open `http://127.0.0.1:9080/install/` or Storybook at `http://127.0.0.1:6006` (after `pnpm dev`).

UI source: `packages/apps` → `packages/apps/dist/`. The install shell `apps/wegotworkspace` holds config (`wgw-config.php`) and data (`wgw-content/`) only during normal dev.

## Updating ONLYOFFICE Web

`packages/onlyoffice-web` is tracked as a git-subtree style vendored dependency.

Update it from the upstream repo with:

```bash
pnpm run update:onlyoffice-web
```

Optional args:

```bash
bash tools/update-onlyoffice-web-subtree.sh <repo-url> <branch> [--squash|--no-squash]
```

After updating, rebuild the package so runtime assets are synced into `apps/wegotworkspace/packages/apps/office/build/`:

```bash
pnpm --filter @wgw/onlyoffice-web build
```

## Release artifacts

Release ZIP files are built in CI from signed tag pushes (`v*`) via `.github/workflows/release.yml`.

Local build command:

```bash
pnpm release
```

The deploy artifact includes `INSTALL.md` so people downloading a release get the install steps directly in the package.

## License

Dual licensed:
- AGPL-3.0-or-later (`LICENSE`)
- Commercial (`COMMERCIAL-LICENSE.md`)
