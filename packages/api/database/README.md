# Laravel `database/` directory

Production schema is created by the **installer** (`src/sql/sqlite|mysql/*.sql`), not by `php artisan migrate`.

Use this folder only for optional dev fixtures or future additive migrations agreed with the installer. See `docs/sql-schema.md`.
