# API testing (PHPUnit)

## Gate

A domain is **not done** until feature tests pass for its routes without calling legacy handlers, and **`composer greenfield:guard`** passes.

## Required

- Feature test per controller/route (status + JSON vs OpenAPI / captured fixtures)
- Unit tests for services and non-trivial repositories
- Database-backed tests extend **`Tests\Support\WgwDatabaseTestCase`** (Laravel `RefreshDatabase` on the `wgw` connection)
- Factories in `database/factories/` (`UserFactory`, `PrincipalFactory`, `GroupMemberFactory`)
- `SeedsWgwIdentity` on `WgwDatabaseTestCase` (`seedWgwUser()`, `seedWgwGroup()`, `addPrincipalToGroup()`) — avoid hardcoded IDs
- File features: `Storage::fake('wgw_files')` / `wgw_notes` — no manual `$tmpDir` unless configuring fake disk root

## `WgwDatabaseTestCase`

Most API and model tests extend `tests/Support/WgwDatabaseTestCase.php`:

- Runs `migrate:fresh` **once** against `database/migrations/wgw` on connection `wgw`
- Wraps each test in a transaction on `wgw` (rollback between tests)
- Calls `WgwTestDatabase::configureConnection()` so SQLite `:memory:` is the default and `WGW_TEST_DRIVER=mysql` still works

PHPUnit sets `DB_CONNECTION=wgw` and `WGW_DB_DATABASE=:memory:` in `phpunit.xml`.

**Exceptions** (do not extend `WgwDatabaseTestCase`):

- **Installer** tests — exercise first-run DB creation from an empty install tree
- **Migrator** tests — seed legacy schema versions and assert incremental upgrades
- Pure unit tests with no database

## Architecture tests

`tests/Architecture/GreenfieldArchitectureTest.php` and `scripts/greenfield-guard.php` enforce:

- No legacy handlers, `Paths`, or raw file I/O in domain layers
- Domain services do not use `DB::connection('wgw')->table()`
- All `app/Models/*.php` use `UsesWgwConnection`
- No runtime `ALTER TABLE` DDL in domain services

## Mail

Assert `{ error, message }` shape where contract requires it.
