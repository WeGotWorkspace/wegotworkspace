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

## Phase 1+ — Domains (OpenAPI order)

Implement route groups with feature tests before moving on. Suggested order:

1. **Auth** — `POST /auth/token`, refresh, revoke, `GET /me`, `GET /.well-known/jwks.json`
2. **System** — `GET /health`, `GET /capabilities`
3. **Settings** — state, profile, mail credentials
4. **Notes** — CRUD + notebooks (Flysystem `wgw_notes`)
5. **Home**, installer API (if still required)
6. **Drive** + office (Flysystem `wgw_files`)
7. **Admin** + updates
8. **Mail** (IMAP/SMTP services; preserve `{ error, message }` shape)
9. **Voice**
10. **Sabre** — Cal/Card may keep PDO backends; **files** WebDAV must use the same Flysystem disk as REST

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
