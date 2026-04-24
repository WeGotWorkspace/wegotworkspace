# WeGotWorkspace

A small PHP application that ships [sabre/dav](https://github.com/sabre-io/dav) with a **web-based setup wizard** (similar in spirit to WordPress’s installer): environment checks, SQLite or MySQL, first user with default calendar and address book, and a **WebDAV files** tree at `/files/`.

## Repository vs instance

This repo mixes **product code** and **generated assets** in one tree, and keeps **server-specific state** out of git. It helps to think in three buckets:

| Bucket | What it is | In git? |
|--------|----------------|--------|
| **Source** | [`apps/wegotworkspace/index.php`](apps/wegotworkspace/index.php), [`apps/wegotworkspace/.htaccess`](apps/wegotworkspace/.htaccess), [`apps/wegotworkspace/wgw-src/`](apps/wegotworkspace/wgw-src/), [`apps/wegotworkspace/wgw-config.sample.php`](apps/wegotworkspace/wgw-config.sample.php), [`packages/admin-ui/`](packages/admin-ui/), [`packages/drive-ui/`](packages/drive-ui/), [`packages/voice-ui/`](packages/voice-ui/), [`packages/mail-ui/`](packages/mail-ui/), [`packages/docs/overlay`](packages/docs/) | Yes |
| **Generated** | [`apps/wegotworkspace/vendor/`](apps/wegotworkspace/vendor/) (Composer), [`apps/wegotworkspace/wgw-modules/docs/build/`](apps/wegotworkspace/wgw-modules/docs/) (from `packages/docs`), [`apps/wegotworkspace/wgw-modules/admin/dist/`](apps/wegotworkspace/wgw-modules/admin/) (from `packages/admin-ui`), [`apps/wegotworkspace/wgw-modules/drive/dist/`](apps/wegotworkspace/wgw-modules/drive/) (from `packages/drive-ui`), [`apps/wegotworkspace/wgw-modules/voice/dist/`](apps/wegotworkspace/wgw-modules/voice/) (from `packages/voice-ui`), [`apps/wegotworkspace/wgw-modules/mail/dist/`](apps/wegotworkspace/wgw-modules/mail/) (from `packages/mail-ui`) | No |
| **Instance** | Database, uploaded files, sessions, installer lock file, etc., under the **instance data directory** (default `apps/wegotworkspace/wgw-content/`, configurable), plus `apps/wegotworkspace/wgw-config.php` | No |

The **web installer** is not a separate frontend app under `apps/`. It is **server-rendered PHP** under [`apps/wegotworkspace/wgw-src/Installer/`](apps/wegotworkspace/wgw-src/Installer/), exposed at **`/install/`** until setup finishes (see [`apps/wegotworkspace/index.php`](apps/wegotworkspace/index.php)).

**Admin** now serves a static frontend from [`packages/admin-ui/`](packages/admin-ui/) at **`/admin/`**, with admin access still enforced server-side from [`apps/wegotworkspace/wgw-src/Admin/`](apps/wegotworkspace/wgw-src/Admin/).

**Turborepo:** from the repo root, **`pnpm build`** runs **`turbo run build`**. The workspace package [**`@wgw/php-deps`**](packages/php-deps/) runs **`composer install`** so every UI package can depend on **`^build`** in Turbo and still install PHP dependencies first. That package is **not** the web installer; it only wires Composer into the JS workspace.

**Demos and data outside the clone**

- Set `data_dir` in **`apps/wegotworkspace/wgw-config.php`** (copied from `wgw-config.sample.php`) to an absolute path, or a path relative to the runtime root (for example `./wgw-content` or `../shared/wgw-content`).
- Or set the environment variable **`SABRE_DATA_DIR`**; it overrides `data_dir` and supports the same absolute/relative formats.
- If both are unset, the runtime uses the default `wgw-content/` folder.

`apps/wegotworkspace/wgw-content/*` and `apps/wegotworkspace/wgw-config.php` remain gitignored regardless (adjust if you customize folder names).

### Configurable runtime folders

By default, the app runtime root (`apps/wegotworkspace`) contains `index.php`, `.htaccess`, `wgw-src/`, `vendor/`, `wgw-modules/` (UI build outputs), and `wgw-content/`.

- **`SABRE_BUILD_DIR`**: optional runtime root (absolute path, or relative to `apps/wegotworkspace`), for example `build` or `dist`.
- **`SABRE_PUBLIC_DIR_NAME`**: optional document-root folder name under the runtime root (default `.` which means the runtime root itself).
- **`SABRE_PRIVATE_DIR_NAME`**: private app folder name under the runtime root (default `wgw-modules`).
- **`SABRE_DATA_DIR_NAME`**: default data folder name under the runtime root (default `wgw-content`).
- **`SABRE_DATA_DIR`**: full data path override (takes precedence over `SABRE_DATA_DIR_NAME`).

Frontend build outputs (`admin`, `settings`, `drive`, `voice`, `mail`, and `docs`) now follow these same runtime variables under the app root, so `pnpm build` can target `apps/wegotworkspace/build/wgw-modules/...` (or `apps/wegotworkspace/dist/wgw-modules/...`) directly.

Composer defaults to writing dependencies to `vendor/` in the app root. To install into a custom runtime root, use:

```bash
COMPOSER_VENDOR_DIR="<runtime-root>/vendor" composer install
```

### Layout

- **`apps/wegotworkspace/index.php`** + **`apps/wegotworkspace/.htaccess`** — web front controller and rewrite/security rules (document root is `apps/wegotworkspace/`).
- **`apps/wegotworkspace/wgw-src/`** — merged backend source and resources (installer, Sabre integration, kernels, SQL, FileGator routes).
- **`apps/wegotworkspace/wgw-config.sample.php`** — config sample.
- **`apps/wegotworkspace/vendor/`** — Composer dependencies (generated).
- **`apps/wegotworkspace/wgw-modules/`** — generated static UI bundles (`admin`, `settings`, `drive`, `voice`, `mail`, `docs`).
- **`packages/php-deps/`** — Turbo dependency that runs **`composer install`** in `apps/wegotworkspace`.
- **`packages/dev-server/`** — Turbo **`dev`** task: PHP’s built-in server for local smoke tests.

## Requirements

- PHP **8.1+** with extensions: `pdo`, `pdo_sqlite` (default) and/or `pdo_mysql`, `dom`, `mbstring`, `json`, `ctype`, `iconv`, `simplexml`
- Apache **2.4+** with `mod_rewrite` and `mod_php` (or another SAPI; this package is tested and documented primarily for Apache + `apps/wegotworkspace/.htaccess`)

## Install

```bash
composer --working-dir apps/wegotworkspace install
```

Composer installs dependencies into **`apps/wegotworkspace/vendor/`** by default (see `vendor-dir` in `apps/wegotworkspace/composer.json`), unless you override with `COMPOSER_VENDOR_DIR`.

SQLite is configured with **`pdo.sqlite_file`** in `apps/wegotworkspace/wgw-config.php`: a path relative to the runtime root (for example `./wgw-content/db.sqlite`), so you can upload the tree over SFTP without editing absolute filesystem paths. Legacy installs may still use **`pdo.dsn`** with an absolute `sqlite:…` URL; that keeps working too.

Point your site’s **document root** at `apps/wegotworkspace/` (the app root, not the monorepo root). On many hosts you can set the document root to a subdirectory such as `public_html/wegotworkspace/apps/wegotworkspace`.

If the app lives in a subdirectory, edit `apps/wegotworkspace/.htaccess` and set `RewriteBase` to that path (for example `RewriteBase /clients/mydomain/`).

### `/` works but `/addressbooks/` or `/calendars/` is 404

Usually Apache never runs `apps/wegotworkspace/index.php` for those URLs:

- **`mod_rewrite` must be allowed** for `.htaccess` (`AllowOverride` must include `FileInfo` or `All` on many hosts).
- **`Options -MultiViews`** is set in `apps/wegotworkspace/.htaccess` so Apache does not try to “negotiate” fake paths like `addressbooks` as files.
- **`DirectoryIndex index.php`** is set so the site root is handled consistently.

Also confirm **`base_uri`** in `apps/wegotworkspace/wgw-config.php` matches the URL path where the app is mounted (e.g. `/` at `https://cloud.example.com/`, not a stale subdirectory from an old install).

`apps/wegotworkspace/.htaccess` uses a **strict front-controller** pattern: only requests that map to a **real file** in the document root bypass `index.php`; requests to runtime internals like `wgw-modules/` and `wgw-content/` are denied. Paths that map to **directories** on disk are **not** whitelisted (no `RewriteCond … !-d`), so a stray folder cannot shadow a DAV URL like `/addressbooks/`.

### MAMP and HTTP Basic auth

MAMP often runs PHP as **FastCGI / PHP-FPM**. Apache may strip the `Authorization` header, so every login looks wrong even with valid credentials.

`apps/wegotworkspace/.htaccess` already includes mitigations (`CGIPassAuth` when `mod_proxy_fcgi` is loaded, plus a `RewriteRule` that copies `Authorization` into `HTTP_AUTHORIZATION` for Sabre’s SAPI layer). If auth still fails, add **`CGIPassAuth On`** inside the `<Directory>` / virtual host block for this site in MAMP’s Apache config (some setups ignore `.htaccess` for that directive).

## First run

Open the site URL in a browser. You will be redirected to `/install/` until setup finishes. The wizard:

1. Checks PHP version, extensions, and writable **instance data** (see **`SABRE_DATA_DIR`** above; default `wgw-content/`) and runtime root
2. Creates the database schema (from SabreDAV’s official SQL for **4.7.x**, vendored under `apps/wegotworkspace/wgw-src/sql/`)
3. Creates your first account (HTTP **Basic** auth with bcrypt in the `users.digest` column)
4. Writes `apps/wegotworkspace/wgw-config.php` and **`.installed`** in the instance data directory (which disables the installer)

On the **Site** step you can disable SabreDAV’s **HTML browser UI** (the `DAV\Browser\Plugin` tree). That choice is saved as **`browser_plugin`** in the `app_settings` table (seeded from installer defaults on first run).

You can also turn off **WebDAV files** (`/files/`), **Calendars (CalDAV)**, or **Contacts (CardDAV)**; at least one of the three must stay enabled. These map to **`files_enabled`**, **`calendar_enabled`**, and **`contacts_enabled`** in `app_settings` (and can be changed later in `/admin`).

**CalDAV / CardDAV clients** often need the **server URL with a trailing slash**. Use the base URL shown on the last step (for example `https://example.org/` or `https://example.org/myapp/`).

### macOS Calendar and Contacts (Address Book)

Apple’s apps often start from **RFC 6764** discovery (`/.well-known/caldav` and `/.well-known/carddav`). When the matching feature is enabled, the app answers with a **307 redirect** to your configured `base_uri` (same as in `apps/wegotworkspace/wgw-config.php`). If calendars or contacts were disabled at install time, the corresponding `/.well-known/…` URL returns **404** instead.

If **automatic** setup still fails, use **Advanced** and point at Sabre’s real paths (replace `YOURUSER` with the installer username, e.g. `alice`):

**Calendar (CalDAV)**

- Server: your host only (e.g. `localhost` or `127.0.0.1`), or include scheme if the UI offers a single “Server URL” field.
- Port: MAMP’s Apache port (often `8888` or `80`).
- Path: `/principals/YOURUSER/` **or** calendar home `/calendars/YOURUSER/` (trailing slash helps).
- SSL: on if you use HTTPS in MAMP; many setups need HTTPS for Apple’s apps even on localhost.

**Contacts (CardDAV)**

- Path: `/addressbooks/YOURUSER/default/` **or** principal `/principals/YOURUSER/`.

If the site is not at the domain root (e.g. `http://localhost:8888/sabre/`), include that prefix in the path: `/sabre/principals/YOURUSER/`.

**HTTPS:** If you only use HTTP and Calendar/Contacts refuse to connect, enable SSL in MAMP (self-signed is fine) and use `https://…` in the account.

## Security notes

- With the vhost docroot set to **`apps/wegotworkspace/`**, source/config/runtime paths stay protected by `apps/wegotworkspace/.htaccess`.
- After installation, `/install/` redirects to the site root (**302**).
- To reinstall: remove **`.installed`** from your instance data directory (default `wgw-content/.installed` if **`SABRE_DATA_DIR`** is unset) and `apps/wegotworkspace/wgw-config.php`, then fix or replace the database file; for MySQL, drop tables or use a fresh database.

## Development server

Apache-style rewriting is not used by PHP’s built-in server. For local smoke tests, from the repo root:

```bash
pnpm dev
```

This runs Turbo **`dev`** for `@wgw/dev-server` and **`watch`** for admin/drive/voice/mail/settings in one command. Turbo first runs required **`build`** tasks (`@wgw/php-deps` included), then starts **`php -S 127.0.0.1:8080`** with document root **`apps/wegotworkspace/`** from the [`@wgw/dev-server`](packages/dev-server/) package while UI packages keep rebuilding static assets into `apps/wegotworkspace/wgw-modules/**` on file changes. To start only the PHP server (no watchers), use **`pnpm dev:php`**.

For **Homebrew Apache + trusted local HTTPS** on macOS (uses system `httpd`, not this repo’s PHP only), first run one-time bootstrap **`pnpm --filter @wgw/wegotworkspace setup:macos`** (or root alias **`pnpm setup:macos`**) to install/configure Homebrew `httpd`, `php`, `mkcert`, and base Apache modules — see `apps/wegotworkspace/scripts/macos/install-homebrew-apache-ssl.sh`. Then run **`pnpm --filter @wgw/wegotworkspace preview:macos`** (or root alias **`pnpm preview:macos`**) for day-to-day vhost/docroot/certificate refresh + Apache start — see `apps/wegotworkspace/scripts/macos/setup-homebrew-apache-ssl.sh`. If IMAP still does not load after an upgrade, run **`pnpm --filter @wgw/wegotworkspace enable-php-imap`** and **`brew services restart httpd`**.

`pnpm --filter @wgw/wegotworkspace preview:macos` also loads this repo's `.env` (if present) and forwards `SABRE_*` runtime variables to Apache so `apps/wegotworkspace/index.php` can resolve custom runtime layouts.

Optional environment variables (same shell, before `pnpm --filter @wgw/wegotworkspace preview:macos`):

- **`WEBROOT`** — Apache document root override. If unset, the script auto-picks the runtime document root (from `SABRE_BUILD_DIR` + optional `SABRE_PUBLIC_DIR_NAME`), then falls back to `apps/wegotworkspace/`, then Homebrew `var/www`.
- **`VHOST_DOMAIN`** — extra local hostname (e.g. `export VHOST_DOMAIN="sabre.test"`). The script adds it to **`mkcert`**, writes HTTP/HTTPS vhosts on **8080 / 8443**, and appends **`127.0.0.1`** to **`/etc/hosts`** (requires **`sudo`**).

Then open `http://127.0.0.1:8080/install/` (or **`https://$VHOST_DOMAIN:8443/install/`** when a vhost domain is set). Match **`base_uri`** in `apps/wegotworkspace/wgw-config.php` to the URL you use.

### Web office (ZIZIYI Office)

When **WebDAV files** are enabled, open **`/office/`** (with your subdirectory prefix if needed, e.g. `/myapp/office/`). The server uses **HTTP Basic** with the same **realm and user database** as SabreDAV; after you authenticate once, the app can call WebDAV under `files/…` with **`fetch(..., { credentials: 'include' })`** so the browser reuses that session.

The UI is a Next.js static export from [`packages/docs/`](packages/docs/) into **`apps/wegotworkspace/wgw-modules/docs/build/`**. After changing the overlay or upstream pin, from the repo root run **`pnpm --filter @wgw/docs build`** or:

```bash
bash packages/docs/scripts/sync-and-build.sh
```

**`.htaccess`** routes **`/office/`**, **`/office/index.html`**, and the editor shell through `index.php` so `window.__SABRE_OFFICE_CONFIG__` is injected. On **`php -S … apps/wegotworkspace/index.php`**, `/office/` and static assets under `/office/_next/…` are handled through the router.

Old **`/sheets/`** and **`/docs/`** URLs **301** to **`/office/`** so existing bookmarks keep working.

The upstream [office-website](https://github.com/baotlake/office-website) stack is **AGPL-3.0**. If you redistribute this installer with the built office UI included, ensure your use complies with the AGPL. This installer project is also available under **AGPL-3.0-or-later** with a separate commercial license option; see the License section below. SabreDAV is BSD-3-Clause; see [sabre.io](https://sabre.io/).

### Admin (Cloud Harmony Hub)

**`/admin/`** now serves the **Cloud Harmony Hub** UI from [`packages/admin-ui/`](packages/admin-ui/) (integrated from [cloud-harmony-hub](https://github.com/woutervroege/cloud-harmony-hub)). Access control remains server-side with the same admin group policy as before.

Build with **`pnpm --filter @wgw/admin-ui build`** or **`pnpm build`**. Output is **`apps/wegotworkspace/wgw-modules/admin/dist/`** (gitignored).  

### File browser (Drive)

When **WebDAV files** are enabled, **`/drive/`** serves the **Drive** UI from [`packages/drive-ui/`](packages/drive-ui/) (integrated from [drive-studio](https://github.com/woutervroege/drive-studio)) on the **same PHP process** as the installer, talking to the existing **FileGator JSON API** (`?r=…`) and the same **HTTP Basic** auth and file tree as WebDAV. Build once from the project root with **`pnpm --filter @wgw/drive-ui build`** or **`pnpm build`** (Turborepo). Output is written directly to **`apps/wegotworkspace/wgw-modules/drive/dist/`** (gitignored). Static assets live under **`/drive/assets/…`**. Without that build, **`/drive/`** shows a short “build missing” page until you run the command above.

By default storage is a **Flysystem local** adapter under **`<instance-data>/files/`** (default `wgw-content/files/`), the same on-disk tree SabreDAV uses, with per-user isolation aligned to WebDAV ACLs. **Authentication** matches **`/office/`** (Apache may need `CGIPassAuth On` so PHP sees `Authorization`, as in the office section).

Optional **WebDAV** storage for FileGator’s adapter: add a `filegator` block in **`apps/wegotworkspace/wgw-config.php`** with keys used by `App\Filegator\FilegatorConfigBuilder` (`storage=webdav`, `webdav_base_uri`, `webdav_username`, `webdav_password`, optional `webdav_path_prefix`) ([filegator#226](https://github.com/filegator/filegator/issues/226)). That uses **one** Sabre WebDAV account for all Drive sessions; per-user isolation is only guaranteed with the default **local** adapter.

### Voice (Aura Voice / WebRTC)

When **WebDAV files** are enabled, **Aura Voice** from [`packages/voice-ui/`](packages/voice-ui/) (integrated from [bright-face-connect](https://github.com/woutervroege/bright-face-connect)) is served under **`/voice/`**:

- **`/voice/`** — Same **HTTP Basic** / signed UI cookie as **`/drive/`** and **`/office/`** (Sabre accounts only). Hosts start calls here.
- **`/voice/join/`** — **Public** (no login). Guests can open **`/voice/join/`** and type a code, or open a **deep link** like **`/voice/join/VLG3-H9QD-UV6Q`**. Static files under **`/voice/assets/…`** are public so that page can load. In-call, use **copy join link** to share the full URL.

**Legacy:** old **`/talk/`** and **`/talk/join/`** URLs **308** to **`/voice/`** and **`/voice/join/`** (see [`apps/wegotworkspace/index.php`](apps/wegotworkspace/index.php)). Pasted join links that still contain **`/talk/join/`** are recognized when parsing a room code.

**Starting** a new room still requires a Sabre user at the signaling layer: the first `join` to an **empty** room must carry a valid cookie or **Basic** credentials; `join` to a room that already has someone is public. Signaling is **`/voice/aura-signaling/rooms.php`** (SQLite under **`<instance-data>/voice-signaling/`**, default `wgw-content/voice-signaling/`). Share **`…/voice/join/`** with people who should not get a site login.

Build once with **`pnpm --filter @wgw/voice-ui build`** or **`pnpm build`**. Output goes to **`apps/wegotworkspace/wgw-modules/voice/dist/`** (gitignored). If an older checkout still has **`apps/wegotworkspace/wgw-modules/talk/dist/`**, delete it and rebuild so the runtime (which reads **`apps/wegotworkspace/wgw-modules/voice/dist/`**) can find the bundle. Use **HTTPS** in production; browsers require a secure context for camera/microphone. Optional TURN/STUN values are still stored only in the browser (see upstream settings).

### Mail (Inkmail)

When **WebDAV files** are enabled, **`/mail/`** serves the **Inkmail** UI from [`packages/mail-ui/`](packages/mail-ui/) (integrated from [mail-whisperer-02](https://github.com/woutervroege/mail-whisperer-02)). It uses the same **HTTP Basic** / signed UI cookie as **`/drive/`** and **`/office/`**. The current build is a **browser-local** mock (folders and messages in `localStorage`); IMAP/SMTP fields in Settings are stored only in the browser until you wire a backend.

Build with **`pnpm --filter @wgw/mail-ui build`** or **`pnpm build`**. Output is **`apps/wegotworkspace/wgw-modules/mail/dist/`** (gitignored). Static assets are under **`/mail/assets/…`**.

## License

This project is dual licensed:

- **Open Source:** **AGPL-3.0-or-later** (`LICENSE`), allowing anyone to use, modify, and redistribute under AGPL terms.
- **Commercial:** separate paid licensing for providers that offer the software as a hosted/service product and prefer not to comply with AGPL obligations (`COMMERCIAL-LICENSE.md`).

SabreDAV is BSD-3-Clause; see [sabre.io](https://sabre.io/). Third-party front-end bundles may use other licenses (see the Web office section above). FileGator is MIT ([filegator/filegator](https://github.com/filegator/filegator)). Admin, Drive, Aura Voice, and Mail live in this repo under **`packages/admin-ui/`**, **`packages/drive-ui/`**, **`packages/voice-ui/`**, and **`packages/mail-ui/`**; they originated as separate projects—see [cloud-harmony-hub](https://github.com/woutervroege/cloud-harmony-hub), [drive-studio](https://github.com/woutervroege/drive-studio), [bright-face-connect](https://github.com/woutervroege/bright-face-connect), and [mail-whisperer-02](https://github.com/woutervroege/mail-whisperer-02) for upstream history and license terms.
