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
- PHP 8.3+
- Node.js 20+
- pnpm 9+

From the repository root:

```bash
pnpm install
pnpm dev
```

`pnpm dev` bootstraps `packages/apps` and `packages/api` into `apps/wegotworkspace`, then keeps watching both packages and re-syncing on change (Vite rebuild + runtime copy for UI, file sync for API). Use `pnpm dev:php` in another terminal for the built-in PHP server, or your Apache vhost.

Optional: `pnpm dev:storybook` (component docs), `pnpm dev:onlyoffice` (ONLYOFFICE web package). Use `pnpm build` for a full production build (CI/release).

Open `http://127.0.0.1:8080/install/`.

Frontend note: all first-party web apps (`/admin`, `/drive`, `/mail`, `/notes`, `/voice`, `/settings`, `/home`, `/install`) are built from `packages/apps` and emitted into `apps/wegotworkspace/packages/apps/*/dist/`.

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
