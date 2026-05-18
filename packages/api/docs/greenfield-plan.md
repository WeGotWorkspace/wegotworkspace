# API greenfield plan

Authoritative process for replacing the legacy `packages/api/src/` REST runtime with a **Laravel** application under `packages/api/app/`.  
HTTP contract: **`openapi/openapi.json`** + Pest/PHPUnit feature tests.

## Principles

| Do | Don't |
|----|--------|
| Reimplement behavior in Services, Models, Form Requests, Resources | Rename or wrap `MailApi`, `DriveKernel`, `*Kernel` |
| Eloquent / `DB::connection('wgw')` for app tables | Pass `\PDO` through controllers and services |
| `WgwStorage` (Flysystem) for all file data | `Paths::data()`, `file_put_contents`, `readfile` in domain code |
| One controller (or invokable) per route group | `DomainRouteService` mega-dispatcher |
| Delete legacy entry points when a domain is ported | “Thin wrapper” PRs that call old code |

Sabre **Cal/Card** stay on PDO backends. Sabre **files** WebDAV use the **same** Flysystem disk as REST (`wgw_files`).

## Bootstrap order (merge one phase at a time)

Each phase ends with **tests green** + **`composer greenfield:guard`**.

### Phase 0 — Scaffold

- [x] Fresh Laravel app in `packages/api` (`artisan`, `bootstrap/`, `app/`, `routes/api.php`, `config/`)
- [x] Keep `openapi/`, `src/sql/` (installer schema reference), `docs/`
- [ ] Do **not** copy `src/Api`, `MailApi`, `*Kernel` into `app/`
- [x] `config/filesystems.php`: disks `wgw_data`, `wgw_files`, `wgw_notes`
- [x] `app/Storage/WgwStorage.php` + path/ACL helper (`StoragePaths`)
- [x] Service provider: map `wgw-config.php` → Laravel config + disk roots
- [x] `tests/` with `Storage::fake()` smoke test

### Phase 1 — Database layer

- [x] Laravel migration or documented alignment with `src/sql/*.sql` tables (`docs/sql-schema.md`)
- [x] Eloquent models: `User`, `Principal`, `AppSetting`, `GroupMember` (Sabre/installer tables)
- [x] `wgw` connection from install config (`WgwDatabaseConfig` + `WgwServiceProvider`)

### Phase 2 — Auth

- [x] JWT RS256 + refresh (OpenAPI wire shape)
- [x] Feature tests: `auth/token`, `auth/refresh`, `auth/revoke`, `me`, `jwks`
- [x] No `ApiAuth` + `$_SERVER` in domain code

### Phase 3 — System + settings (first REST domains)

- [x] `GET health`, `GET capabilities`
- [x] Settings state/profile/mail credentials
- [x] Feature tests per route

### Phase 4 — Notes

- [x] `NoteRepository` + markdown codec via `WgwStorage`
- [x] Feature tests for notes CRUD / notebooks

### Phase 5 — Home, DAV capabilities, installer API

- [ ] Small read-only endpoints
- [ ] Installer API if still required before UI move

### Phase 6 — Drive + office

- [ ] Path policy + Flysystem only
- [ ] Feature tests; binary upload/download via storage/stream

### Phase 7 — Admin + updates

- [ ] Eloquent for settings/users/groups
- [ ] Update manager integration (may keep dedicated services)

### Phase 8 — Mail (last)

- [ ] IMAP/SMTP services (not 1500-line static class)
- [ ] Preserve mail error JSON shape `{ error, message }`

### Phase 9 — Voice

- [ ] Signaling services + DB tables via Eloquent/DB

### Phase 10 — Sabre file WebDAV

- [ ] `app/DAV/Storage/*` nodes on `wgw_files` disk
- [ ] Plugins call Laravel services only

### Phase 11 — Front controller

- [ ] Route `/api/*` only through Laravel (`bootstrap/api-front.php`)
- [ ] Retire REST paths from `apps/wegotworkspace/index.php` kernel chain (UI kernels separate project)

## Definition of done (per domain PR)

- [ ] Feature tests added/updated; **`composer test`** passes
- [ ] **`composer greenfield:guard`** passes
- [ ] No new references to `MailApi`, `DriveKernel`, `ApiKernel`, `DomainRouteService`, `WgwRuntime`, `Config::load` in `app/`
- [ ] No `\PDO` parameters in new `app/Services` or `app/Repositories` public APIs
- [ ] File persistence uses `WgwStorage` / `Storage::disk()` only
- [ ] OpenAPI unchanged unless intentional (run `pnpm check:api-types` if types change)
- [ ] PR template checklist completed

## Enforcement

| Tool | Command |
|------|---------|
| Cursor rules | `.cursor/rules/api-*.mdc` |
| Guard script | `composer --working-dir packages/api greenfield:guard` |
| Architecture test | `tests/Architecture/GreenfieldArchitectureTest.php` (when `app/` exists) |
| CI | `.github/workflows/ci.yml` runs guard on every PR |

## Git strategy

- Branch from **`main`** with cursor rules merged (`chore/api-greenfield-rules` or later).
- Do **not** merge `feat/laravel-api` wholesale.
- Cherry-pick only isolated commits (e.g. rules, OpenAPI fixes) if needed.

## First agent message template

```
Greenfield packages/api only. Follow AGENTS.md and packages/api/docs/greenfield-plan.md.
Start Phase N only. No legacy wrappers. Run greenfield:guard when done.
```
