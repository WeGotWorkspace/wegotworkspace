# Database schema (installer-owned)

Greenfield Laravel code uses Eloquent on the **`wgw`** connection. Schema is **not** managed by Laravel migrations in production installs.

## Source of truth

| Engine | SQL files |
|--------|-----------|
| SQLite | `src/sql/sqlite/*.sql` |
| MySQL | `src/sql/mysql/*.sql` |

Applied by the web installer via `App\Installer\SchemaRunner` (legacy). New API work must stay compatible with these tables.

## Core product tables (Phase 1 models)

| Table | Model | Notes |
|-------|--------|--------|
| `users` | `App\Models\User` | Sabre HTTP Basic (`digest` bcrypt) |
| `principals` | `App\Models\Principal` | DAV principals, profile `email` / `displayname` |
| `groupmembers` | `App\Models\GroupMember` | Group membership join |
| `app_settings` | `App\Models\AppSetting` | Key/value site settings (string PK `name`) |

Additional tables (Cal/Card DAV, mail, voice) are defined in the same SQL bundles; add models when those domains are ported.

## Connection

`WgwDatabaseConfig` reads `wgw-config.php` → `database.connections.wgw` at boot (`WgwServiceProvider`). Use `DB::connection('wgw')` or models with `UsesWgwConnection`.
