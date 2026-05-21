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

**Once:** install dependencies and API env (see [`docs/env.md`](docs/env.md)).

```bash
pnpm install
composer --working-dir packages/api install
cp packages/api/.env.example packages/api/.env   # then edit / key:generate
```

**Every day** (Docker API + UI on the host):

```bash
pnpm docker:up
pnpm dev:ui
```

Open **http://127.0.0.1:6006** (Storybook). The UI proxies `/api/v1` to the API on **http://127.0.0.1:9080**.

Edit code in **`packages/api`** and **`packages/apps`** — nothing is copied into `apps/wegotworkspace` during normal dev. Details: [`docs/dev-layout.md`](docs/dev-layout.md).

### WebDAV / HTTPS

For CalDAV/CardDAV/WebDAV clients that need TLS and a stable hostname:

```bash
pnpm docker:ssl:setup    # once: mkcert + /etc/hosts → 127.0.0.1 wegotworkspace.local
pnpm docker:up
```

Then use **https://wegotworkspace.local/** (see [`docker/README.md`](docker/README.md)).

### Other commands

| Command | Use |
|---------|-----|
| `pnpm dev` | Host PHP API + UI + Storybook (no Docker) |
| `pnpm dev:api` | PHP API only on `:9080` |
| `pnpm dev:preview` | Release-like sync into `apps/wegotworkspace/packages/` |
| `pnpm build` | Production build + runtime sync (CI/release) |
| `pnpm test:api-e2e:docker` | Playwright against Docker stack |

Environment variables: [`docs/env.md`](docs/env.md).

CI-quality checks locally: `pnpm run ci:quality` (typegen, lint, format, typecheck, API done gate).

Git hooks (installed on `pnpm install` via Husky):

- **pre-commit** — Prettier + ESLint fix on staged `@wgw/apps` files; Pint on staged `packages/api` PHP
- **commit-msg** — [Conventional Commits](https://www.conventionalcommits.org/) via Commitlint (`feat(scope): subject`)

Use `HUSKY=0 git commit` to skip hooks once. Full gate before push: `pnpm run ci:quality`.

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
