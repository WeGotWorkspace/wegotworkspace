# WeGotWorkspace

WeGotWorkspace is a self-hosted platform evolving into a full autonomous office suite.
It builds on open-source projects and open protocols, including SabreDAV.

**New here?** See **[docs/getting-started.md](docs/getting-started.md)** — pick ZIP install, Docker install, or contributor dev.

It includes:

- WebDAV files (`/files/`)
- CalDAV calendars (`/calendars/`)
- CardDAV contacts (`/addressbooks/`)
- A web installer (`/install/`)
- Product surfaces (`/drive/`, `/mail/`, `/notes/`, `doc`, `/meet/`, `/contacts/`, `/tasks/`)
- Utility surfaces (`/admin/`, `/settings/`)
- Plugin surfaces (always installed separately via **Admin → Plugins**; routes come from each plugin manifest)

Docs for these surfaces are still being expanded.

> **Note:** This repository folder may still be named `sabre-installer` locally — the product is **WeGotWorkspace**.

## Install (production)

| Method | Guide |
| --- | --- |
| **Apache/PHP hosting** (SFTP upload) | [INSTALL.md](INSTALL.md) — download the release ZIP |
| **Docker** (self-host) | [docs/install-docker.md](docs/install-docker.md) — `curl -fsSL https://github.com/WeGotWorkspace/wegotworkspace/releases/latest/download/install \| sh` (or from clone: `docker/install/docker-compose.yml`) |

Both paths run the same runtime tree and `/install/` wizard. ZIP upload covers shared hosting; Docker needs no Node/pnpm on the host.

### Why three folders?

- `packages/api` — API source
- `packages/apps` — UI source (you edit here when developing)
- `apps/wegotworkspace` — **runtime/install shell** assembled by `pnpm build` for releases

See [docs/getting-started.md](docs/getting-started.md) for the full picture.

## Local development (contributors)

**Once:** install dependencies and API env (see [`docs/env.md`](docs/env.md)).

```bash
pnpm install
composer --working-dir packages/api install
cp packages/api/.env.example packages/api/.env   # then edit / key:generate
```

**Every day** (Docker-free — host PHP API + Vite app + Storybook):

```bash
pnpm dev
```

First run also bootstraps local install data (`wgw-config.php`, SQLite, admin user, JWT keys) — no manual OpenSSL step.

Open:

- **http://127.0.0.1:5173** — full app (Vite HMR)
- **http://127.0.0.1:6006** — Storybook
- API on **http://127.0.0.1:9080** (proxied as `/api/v1` from Vite and Storybook)

Edit code in **`packages/api`** and **`packages/apps`** — nothing is copied into `apps/wegotworkspace` during normal dev. Details: [`docs/dev-layout.md`](docs/dev-layout.md).

### Contributor optional: Docker API

Use Docker for the API instead of host PHP (`pnpm docker:up` then keep `pnpm dev` for UI). This is **`compose.dev.yml`** (monorepo bind mounts) — not the production install stack in [docs/install-docker.md](docs/install-docker.md).

### WebDAV / HTTPS (contributor Docker dev)

For CalDAV/CardDAV/WebDAV clients that need TLS and a stable hostname:

```bash
pnpm docker:ssl:setup    # once: mkcert for wegotworkspace.localhost
pnpm docker:up:https
```

Then use **https://wegotworkspace.localhost/** (see [`docker/README.md`](docker/README.md)).

### Other commands

| Command                    | Use                                                    |
| -------------------------- | ------------------------------------------------------ |
| `pnpm dev`                 | Host PHP API + Vite app (HMR) + Storybook (no Docker)  |
| `pnpm dev:api`             | PHP API only on `:9080`                                |
| `pnpm dev:storybook`       | Storybook only on `:6006`                              |
| `pnpm preview`             | Built UI (`vite preview`) + PHP API (no HMR)           |
| `pnpm build`               | Production build + runtime sync (CI/release)           |
| `pnpm test:api-e2e:docker` | Playwright against Docker stack                        |
| `pnpm docker:install:up`   | Production install stack from repo root ([`docker/install`](docker/install/); copy `docker/install/.env.example` → `.env`) |
| `pnpm docker:install:down` | Stop production install stack                          |
| `pnpm docker:install:logs` | Follow logs for production install stack               |

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
- **pre-push** — when `packages/apps/**` changed in commits being pushed: `pnpm test:apps-done-gate` (typecheck, Vitest, Storybook smoke, coverage); otherwise `@wgw/apps` typecheck only

CI also rejects Cursor attribution in PR commits and PR descriptions (covers `--no-verify`). Project hooks block `gh pr create` / `gh pr edit` when the body includes attribution. You can disable injection at the source in **Cursor Settings → Agents → Attribution**.

CI quality jobs (`apps-quality`, `api-quality`) run on **branch HEAD** only — intermediate commits in a PR may fail the done gate until a later fix; that is not a merge blocker when the tip is green.

Use `HUSKY=0 git commit` to skip hooks once (not recommended). Before a merge-ready PR: `pnpm run ci:quality`. Apps UI work: `pnpm test:apps-done-gate` before push (also enforced by pre-push when `packages/apps/**` changed).

## Plugins

Plugins are **never** part of the core deploy ZIP. [WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins) hosts **first-party** plugins; **third-party** plugins are supported when they conform to the same manifest and layout standards. Install any conforming plugin via **Admin → Plugins** (upload the plugin ZIP).

See [`docs/plugins.md`](docs/plugins.md) for the plugin contract, layout, and verification.

## Release artifacts

Release ZIP files and the production Docker image (`ghcr.io/wegotworkspace/wegotworkspace`) are built in CI from **signed annotated** tag pushes (`v*`) via `.github/workflows/release.yml`.

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
