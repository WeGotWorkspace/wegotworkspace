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

## Phase 0 — Scaffold (not started)

When you begin implementation:

1. From repo root, create a new Laravel 11 project **in place** under `packages/api/`:
   - `composer create-project laravel/laravel packages/api-laravel-tmp` then merge **only** Laravel skeleton files into `packages/api/` **without** overwriting `openapi/`, `scripts/`, `docs/`, `package.json`, `README.md`.
   - Or use `laravel new` into a temp dir and copy `app/`, `bootstrap/`, `config/`, `routes/`, `artisan`, `composer.json` (merge dependencies), `public/`, etc.
2. **Single** PSR-4 root: `"App\\": "app/"` only — no `src/` autoload entry.
3. `routes/api.php` with prefix `api/v1` (see OpenAPI `servers`).
4. Wire `apps/wegotworkspace/index.php` to Laravel `public/index.php` (or front controller) **early** — not as a final “Phase 11” surprise.
5. Add `config/filesystems.php` disks (`wgw_data`, `wgw_files`, `wgw_notes`) and `app/Storage/WgwStorage.php` per `.cursor/rules/api-storage-flysystem.mdc`.
6. Installer DB schema: derive migrations from a tagged release’s SQL or document tables in `docs/sql-schema.md` — do not vendor legacy PHP.

Checkpoint: `composer test` green for storage smoke + `php artisan route:list` shows scaffold only.

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
