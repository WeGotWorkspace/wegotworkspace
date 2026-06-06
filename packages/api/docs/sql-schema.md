# Database schema (installer-owned)

Greenfield Laravel code uses **Eloquent models** on the **`wgw`** connection. Domain `Services` must not call `DB::connection('wgw')->table()` — use `app/Models/*` instead.

## Source of truth

Product schema is defined in **`database/migrations/wgw/`** and applied by `WgwSchemaMigrator` during:

- Fresh install (`InstallerDatabaseInstaller`)
- In-place updates (`UpdateRunner` → `running_migrations` step)

Sabre Cal/Card/Locks/PropertyStorage tables are still loaded from driver-specific SQL bundles under `resources/installer/sql/{sqlite,mysql}/` inside migration `2026_06_06_000030_wgw_apply_sabre_sql_bundles.php` until fully ported to Blueprint.

Legacy `app_migrations` (versions 1–9) remains on upgraded installs as audit history; active tracking uses Laravel's `migrations` table on the `wgw` connection.

## Eloquent models

All models use [`UsesWgwConnection`](app/Models/Concerns/UsesWgwConnection.php) (`getConnectionName(): 'wgw'`).

| Table | Model | Notes |
|-------|--------|--------|
| `users` | `App\Models\User` | Sabre HTTP Basic (`digest` bcrypt) |
| `principals` | `App\Models\Principal` | DAV principals, profile `email` / `displayname` |
| `groupmembers` | `App\Models\GroupMember` | Group membership join |
| `app_settings` | `App\Models\AppSetting` | Key/value site settings (string PK `name`) |
| `api_refresh_tokens` | `App\Models\ApiRefreshToken` | JWT refresh tokens (`token_hash` PK) |
| `api_revoked_tokens` | `App\Models\ApiRevokedToken` | Revoked JWT JTIs |
| `app_update_history` | `App\Models\AppUpdateHistory` | In-place update audit log |
| `meet_peers` | `App\Models\MeetPeer` | Meet signaling peers (composite key) |
| `meet_messages` | `App\Models\MeetMessage` | Meet signaling messages |
| `collab_peers` | `App\Models\CollabPeer` | Collab signaling peers |
| `collab_messages` | `App\Models\CollabMessage` | Collab signaling messages |
| `search_documents` | `App\Models\SearchDocument` | Unified search index documents |
| `search_terms` | `App\Models\SearchTerm` | Search token weights (FK → `search_documents`) |
| `drive_starred_items` | `App\Models\DriveStarredItem` | Per-user starred drive paths |
| `calendarobjects` | `App\Models\CalendarObject` | CalDAV objects (search indexer joins) |
| `cards` | `App\Models\Card` | CardDAV vCards (search indexer joins) |
| `mail_user_credentials` | `App\Models\MailUserCredential` | Per-user IMAP/SMTP credentials |

Sabre-owned tables (`calendars`, `addressbooks`, `locks`, `propertystorage`, …) have no app models yet; access them through Sabre backends or add models when a domain needs direct queries.

## PDO exception boundaries

`\PDO` / `getPdo()` is allowed only at system boundaries — not in domain `Services` outside these areas:

| Area | Why PDO remains |
|------|-----------------|
| `Services/Installer/` | Initial DB connect before Laravel is fully booted |
| `Services/Update/UpdateRunner` | Database dump/restore during backup (not history writes) |
| `Services/Settings/GroupDirectoryService` | Sabre `PrincipalBackend` |
| `Services/Admin/*` | Sabre user/group provisioning |
| `Services/Auth/SabreCredentialValidator` | Sabre `PDOBasicAuth` |
| `Dav/SabreServerFactory` | Sabre server PDO bridge |

Everything else uses Eloquent. `greenfield-guard` enforces no `DB::connection()->table()` in domain services and no runtime `ALTER TABLE` DDL in services.

## Connection

`WgwDatabaseConfig` reads `wgw-config.php` → `database.connections.wgw` at boot (`WgwServiceProvider`). Prefer models with `UsesWgwConnection`; use `DB::connection('wgw')` only when Eloquent is not practical (migrations, installer cutover).

## Adding a table

1. Add a migration under `database/migrations/wgw/` using `WgwMigration` + `Schema::hasTable()` guards.
2. Add `app/Models/{Name}.php` with `UsesWgwConnection` and documented `$fillable`.
3. Use the model from `app/Services/{Domain}/` — no `DB::table()`.
4. Extend `tests/Architecture/WgwSchemaParityTest.php` expected table list.
5. Add a feature or database test on `WgwDatabaseTestCase` (SQLite); MySQL parity is covered by CI `api-mysql`.

## Tests

- **Harness:** `WgwDatabaseTestCase` + `WgwTestDatabase` run `migrate:fresh` on `database/migrations/wgw/` (replaces hand-rolled `SqliteWgwSchema`).
- **Drivers:** default SQLite (`:memory:`); set `WGW_TEST_DRIVER=mysql` with `WGW_TEST_MYSQL_*` env vars for MySQL.
- **CI:** `api-mysql` job runs `composer test:mysql`; full stack uses `composer done-gate:full`.
- **Parity:** `tests/Architecture/WgwSchemaParityTest.php` asserts expected tables per driver.
- **Architecture:** `tests/Architecture/GreenfieldArchitectureTest.php` + `scripts/greenfield-guard.php`.
- **Cutover:** `tests/Unit/Installer/WgwSchemaMigratorTest.php` covers fresh migrate, idempotency, and legacy `app_migrations` v0–5.
