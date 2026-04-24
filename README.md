# WeGotWorkspace

WeGotWorkspace is a small self-hosted groupware app powered by SabreDAV.

It includes:
- WebDAV files (`/files/`)
- CalDAV calendars
- CardDAV contacts
- A web installer (`/install/`)
- Optional web apps (`/admin/`, `/drive/`, `/voice/`, `/mail/`, `/office/`)

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
pnpm build
pnpm dev
```

Open `http://127.0.0.1:8080/install/`.

## Release artifacts

Release ZIP files are built with:

```bash
pnpm release:wegotworkspace
```

The deploy artifact includes `INSTALL.md` so people downloading a release get the install steps directly in the package.

## License

Dual licensed:
- AGPL-3.0-or-later (`LICENSE`)
- Commercial (`COMMERCIAL-LICENSE.md`)
