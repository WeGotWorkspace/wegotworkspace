# API greenfield plan

`packages/api` is **contract-only**: `openapi/openapi.json` + generated TypeScript types.  
There is **no** legacy `src/`, no dual autoload, and no cohabiting partial Laravel tree to copy from.

## Principles

| Do | Don't |
|----|--------|
| Match `openapi/openapi.json` (paths, status codes, JSON shapes) | Read or restore deleted `packages/api/src/` |
| Scaffold a **fresh** Laravel app when starting implementation | Move/rename legacy folders and keep static `*Kernel` / `MailApi` |
| Pest/PHPUnit feature tests per route group before calling a domain done | “Thin wrapper” services that delegate to old code |
| Eloquent + Flysystem in new `app/` | `\PDO` passed through controllers; `Paths::data()` in domain code |

**Contract parity ≠ code parity.** Old behavior lives only in git history and production tags — not in this workspace.

## Phase 0 — Scaffold

- [x] Fresh Laravel 11 app under `packages/api/` (single `App\` PSR-4, no `src/`)
- [x] Keep `openapi/`, typegen `scripts/`, `docs/`
- [x] `apiPrefix: api/v1` in `bootstrap/app.php`
- [x] `apps/wegotworkspace/index.php` forwards `/api/*` to Laravel `public/index.php`
- [x] Flysystem disks + `WgwStorage` + `Storage::fake()` tests
- [x] `GET /api/v1/health` smoke route + feature test
- [x] `composer greenfield:guard` in CI

Checkpoint: `composer test` green; no legacy `src/` in tree.

## Phase 1 — Database layer

- [x] Eloquent models on `wgw` connection (`User`, `Principal`, `GroupMember`, `AppSetting`, …)
- [x] `WgwDatabaseConfig` maps install `wgw-config.php` PDO settings

## Phase 2 — Auth

- [x] JWT RS256 + refresh (`JwtCodec`, not legacy `ApiToken`)
- [x] Feature tests: token, refresh, revoke, me, jwks

## Phase 3 — System + settings

- [x] `GET /health`, `GET /capabilities`
- [x] Settings state / profile / mail credentials

## Phase 4 — Notes

- [x] Notes CRUD + notebooks via `NoteRepository` + Flysystem
- [x] Feature tests

## Phase 5 — Home, installer, DAV

- [x] `GET /home/state` (auth)
- [x] `GET /dav/capabilities` (auth)
- [x] `GET /installer/state`, `GET /installer/bootstrap`, `POST /installer/action` (session-backed wizard)
- [x] Installer schema SQL + fresh DB seed (Sabre Cal/Card PDO backends during install only)
- [x] Feature tests

## Phase 6 — Drive

- [x] `GET /drive/user`, listing, search, cwd, CRUD, upload/download, stars
- [x] Flysystem via `WgwStorage` + `StoragePaths` ACL
- [x] Feature tests

## Phase 7 — Office

- [x] `GET /office/capabilities`
- [x] `POST` / `PUT /office/documents` (Flysystem, drive ACL)
- [x] `POST /office/session` (UI cookie for ONLYOFFICE; used by apps, not yet in OpenAPI)
- [x] Feature tests

## Phase 8 — Admin

- [x] `GET /admin/state` (users, groups, settings slices, embedded updates)
- [x] `GET` / `DELETE /admin/updates/log`
- [x] `GET /admin/updates/state`, `POST /admin/updates/check|apply|cancel` (apps; not all in OpenAPI)
- [x] `GET` / `DELETE /admin/updates/backups/{name}`; `POST /admin/updates/backups` → 404 (manual backup N/A)
- [x] `PUT` / `DELETE /admin/groups/{group}/members/{username}`
- [x] Feature tests

## Phase 9 — Mail

- [x] `GET /mail/status`
- [x] `GET` / `POST` / `PATCH` / `DELETE` `/mail/folders`
- [x] `GET /mail/messages`, `GET /mail/messages/attachments`
- [x] `GET` / `PATCH /mail/message`, `GET /mail/message/attachment`
- [x] `POST /mail/move`, `POST /mail/send`, `POST /mail/draft`
- [x] IMAP via `MailImapClient` + SMTP via PHPMailer; `{ error, message }` on failures
- [x] Feature tests (status + error shapes without live IMAP)

## Phase 10 — Voice

- [x] `POST /voice/join`, `poll`, `send`, `leave`, `chat` (guest sessionKey or JWT)
- [x] `POST /voice/room` (apps room probe; not yet in OpenAPI spec)
- [x] SQLite/MySQL `voice_peers` / `voice_messages` signaling store
- [x] Feature tests (guest join/poll/leave + error shapes)

## Phase 11 — Sabre / WebDAV

- [x] `SabreServerFactory` + `SabreKernel` (Cal/Card PDO backends, files on `wgw_files` root)
- [x] Port `app/Dav/Server/*` tree + cookie/basic auth (`SabrePdoBasicAndCookieAuth`)
- [x] `packages/api/public/sabre.php` + `apps/wegotworkspace/index.php` forwards non-API traffic
- [x] Feature test: server factory builds when install lock present
- [x] Flysystem-native DAV nodes (`app/Dav/Storage/*` on `wgw_files` keys `users/`, `groups/`)

## Phase 12 — UI static shells

- [x] `UiStaticServer` + `UiFrontKernel` (shell SPA routes + `/install` dist)
- [x] `packages/api/public/ui.php` + `apps/wegotworkspace/index.php` tries UI before Sabre
- [x] `AppPaths::moduleDistRoot()` resolves `packages/apps/{module}/dist`
- [ ] Per-app dedicated dist fallbacks when built separately (drive, mail, …)
- [x] Office editor static entry (`/office/*` via `OfficeStaticServer` + config-injected HTML shells)

## Phase 13+ — Remaining

- Per-app dedicated dist fallbacks when built separately (drive, mail, …)

Each phase: routes → Form Requests → Resources → Services → tests → delete any temporary stubs.

## Definition of done (whole API)

- Every path in `openapi/openapi.json` implemented or explicitly marked deprecated in spec
- Feature tests cover happy path + main error shapes per tag
- No imports from deleted legacy namespaces
- `apps/wegotworkspace` serves UI + API through Laravel only
- Release zip includes Composer `vendor/` for the new runtime

## Agent checklist

1. Read `.cursor/rules/api-greenfield.mdc`
2. Open `openapi/openapi.json` for the route you are implementing
3. Write the test first, then Service + Controller
4. Never add files under `packages/api/src/`
