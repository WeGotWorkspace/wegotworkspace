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
- PHP 8.1+
- Node.js 20+
- pnpm 9+

From the repository root:

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs the required build dependencies automatically. Use `pnpm build` when you want a standalone production build (for CI/release verification).

Open `http://127.0.0.1:8080/install/`.

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

After updating, rebuild the package so runtime assets are synced into `apps/wegotworkspace/wgw-modules/office/build/`:

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
