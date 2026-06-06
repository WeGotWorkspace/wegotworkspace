# Database schema (installer-owned)

Greenfield Laravel code uses Eloquent on the **`wgw`** connection.

## Source of truth

Product schema is defined in **`database/migrations/wgw/`** and applied by `WgwSchemaMigrator` during:

- Fresh install (`InstallerDatabaseInstaller`)
- In-place updates (`UpdateRunner` → `running_migrations` step)

Sabre Cal/Card/Locks/PropertyStorage tables are still loaded from driver-specific SQL bundles under `resources/installer/sql/{sqlite,mysql}/` inside migration `2026_06_06_000030_wgw_apply_sabre_sql_bundles.php` until fully ported to Blueprint.

Legacy `app_migrations` (versions 1–9) remains on upgraded installs as audit history; active tracking uses Laravel's `migrations` table on the `wgw` connection.

## Core product tables (Phase 1 models)

| Table | Model | Notes |
|-------|--------|--------|
| `users` | `App\Models\User` | Sabre HTTP Basic (`digest` bcrypt) |
| `principals` | `App\Models\Principal` | DAV principals, profile `email` / `displayname` |
| `groupmembers` | `App\Models\GroupMember` | Group membership join |
| `app_settings` | `App\Models\AppSetting` | Key/value site settings (string PK `name`) |

Additional tables (meet/collab/search/drive, Cal/Card DAV, mail) are created by wgw migrations; add Eloquent models as domains are refactored.

## Connection

`WgwDatabaseConfig` reads `wgw-config.php` → `database.connections.wgw` at boot (`WgwServiceProvider`). Use `DB::connection('wgw')` or models with `UsesWgwConnection`.

## Tests

`tests/Unit/Installer/WgwSchemaMigratorTest.php` covers fresh migrate, idempotency, and legacy `app_migrations` v0–5 cutover.
