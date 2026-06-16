# WeGotWorkspace

WeGotWorkspace is a self-hosted platform evolving into a full autonomous office suite.
It builds on open-source projects and open protocols, including SabreDAV.

It includes:

- WebDAV files (`/files/`)
- CalDAV calendars (`/calendars/`)
- CardDAV contacts (`/addressbooks/`)
- A web installer (`/install/`)
- Product surfaces (`/drive/`, `/mail/`, `/notes/`, `doc`, `/meet/`)
- Utility surfaces (`/admin/`, `/settings/`)
- Plugin surfaces (always installed separately via **Admin → Plugins**; routes come from each plugin manifest)

Docs for these surfaces are still being expanded.

## Install (production)

Use the step-by-step guide in `INSTALL.md`.

That guide is intentionally short and covers:

- Uploading files to your host
- First-request bootstrap for `packages/api/.env` and `.htaccess` when missing (preserved across in-place updates)
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
pnpm docker:ssl:setup    # once: mkcert for wegotworkspace.localhost
pnpm docker:up:https
```

Then use **https://wegotworkspace.localhost/** (see [`docker/README.md`](docker/README.md)).

### Other commands

| Command                    | Use                                                    |
| -------------------------- | ------------------------------------------------------ |
| `pnpm dev`                 | Host PHP API + UI + Storybook (no Docker)              |
| `pnpm dev:api`             | PHP API only on `:9080`                                |
| `pnpm dev:preview`         | Release-like sync into `apps/wegotworkspace/packages/` |
| `pnpm build`               | Production build + runtime sync (CI/release)           |
| `pnpm test:api-e2e:docker` | Playwright against Docker stack                        |

Environment variables: [`docs/env.md`](docs/env.md).

CI-quality checks locally: `pnpm run ci:quality` (typegen, lint, format, API + apps done gates).

## Security scanning

[`.github/workflows/security.yml`](.github/workflows/security.yml) runs on every pull request and push to `main`:

| Job | Tool | Blocks merge on |
| --- | --- | --- |
| SAST (JS/TS) | CodeQL | HIGH / CRITICAL |
| SAST (PHP) | Semgrep | ERROR-severity security rules |
| Secrets | Gitleaks | Any detected secret |
| SCA | Trivy (Composer + pnpm lockfiles) | CRITICAL / HIGH CVEs |

CodeQL does not support PHP; the Laravel API is scanned with Semgrep instead.

Reports are uploaded as workflow artifacts and (where supported) to **Security → Code scanning**.

**Branch protection on `main`:**

- Required checks: `build` (CI), `SAST (CodeQL JS/TS)`, `SAST (Semgrep PHP)`, `Secrets (Gitleaks)`, `SCA (Trivy)`
- **Signed commits** required (GPG or SSH — same as release tags)
- Rules apply to admins too (no bypass)
- PR required; **0 approvals** for now (single maintainer — raise later)

**Repository setup (org maintainers):**

| Secret / variable | Required | Purpose |
| --- | --- | --- |
| `GITLEAKS_LICENSE` | Yes (org repos) | Free license from [gitleaks.io](https://gitleaks.io) |
| `STAGING_URL` | DAST (later) | ZAP scan target |
| `ENABLE_DAST` | DAST (later) | Repository variable; set to `true` to enable |
| `ZAP_STAGING_USERNAME` / `ZAP_STAGING_PASSWORD` | DAST (later) | Authenticated staging scan |

**DAST (OWASP ZAP)** is scaffolded but disabled until staging and login are configured. See [`.github/zap/README.md`](.github/zap/README.md). When enabled, it runs nightly and on push to `main`; findings open GitHub Issues and are non-blocking until v1.0.

Git hooks (installed on `pnpm install` via Husky):

- **pre-commit** — Prettier + ESLint fix on staged `@wgw/apps` files; Pint on staged `packages/api` PHP
- **prepare-commit-msg** — strips Cursor `Co-authored-by` / `Made-with` trailers before the commit is signed
- **commit-msg** — rejects any remaining Cursor attribution, then [Conventional Commits](https://www.conventionalcommits.org/) via Commitlint (`feat(scope): subject`)
- **post-commit** — verifies `HEAD` has a signature (`git log -1 --format=%G?`); unsigned commits are soft-reset (changes stay staged)

CI also rejects Cursor attribution in PR commits and PR descriptions (covers `--no-verify`). Project hooks block `gh pr create` / `gh pr edit` when the body includes attribution. You can disable injection at the source in **Cursor Settings → Agents → Attribution**.

Use `HUSKY=0 git commit` to skip hooks once (including signature verification). Full gate before push: `pnpm run ci:quality`.

## Plugins

Plugins are **never** part of the core deploy ZIP. [WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins) hosts **first-party** plugins; **third-party** plugins are supported when they conform to the same manifest and layout standards. Install any conforming plugin via **Admin → Plugins** (upload the plugin ZIP).

See [`docs/plugins.md`](docs/plugins.md) for the plugin contract, layout, and verification.

## Release artifacts

Release ZIP files are built in CI from **signed annotated** tag pushes (`v*`) via `.github/workflows/release.yml`.

| Command                               | What it does                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm release`                        | `pnpm build` + **core** package to `dist/releases/` (loads signing key from repo-root `.env`)      |
| `pnpm release -- --skip-build`        | Package only (when `pnpm build` already ran)                                                       |
| `pnpm release:publish patch`          | Bump `apps/wegotworkspace/VERSION`, commit, **signed** tag, push → CI publishes the GitHub Release |
| `pnpm release:publish 1.2.3 --yes`    | Same with an explicit version and no confirmation prompt                                           |
| `pnpm release:publish patch --verify` | Run a local `pnpm release` before commit (catch build errors early)                                |

Publish requires a clean git tree and a **signed annotated** git tag. That uses a separate key from release ZIP signing:

| `.env` variable                   | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `WGW_RELEASE_SIGNING_PRIVATE_KEY` | RSA PEM → `manifest.sig` on deploy ZIPs                            |
| `WGW_GIT_SIGNING_PUBLIC_KEY`      | SSH `.pub` path → `git tag -s` (or set `user.signingkey` globally) |

CI uses the `WGW_RELEASE_SIGNING_PRIVATE_KEY` repository secret for artifacts; the pushed tag must still be signed locally.

The deploy artifact includes `INSTALL.md` so people downloading a release get the install steps directly in the package.

## Contributing

We're not accepting external code contributions yet.

WeGotWorkspace is in the process of establishing its legal structure,
including a Contributor License Agreement (CLA) that protects both
contributors and the project's dual-license model (AGPL + commercial).

Once the CLA is in place, we'll open up contributions properly.

In the meantime:

- Bug reports and feature requests are very welcome via GitHub Issues
- Feel free to fork and experiment
- Watch this repo to get notified when contributions open

Thanks for your interest - we're moving fast.

## License

Dual licensed:

- AGPL-3.0-or-later (`LICENSE`)
- Commercial (`COMMERCIAL-LICENSE.md`)
