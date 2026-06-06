<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use App\Database\WgwInstallerSql;

return new class extends WgwMigration
{
    public function up(): void
    {
        app(WgwInstallerSql::class)->applySabreBundlesIfMissing();
    }

    public function down(): void
    {
        // Sabre tables are shared with DAV; no automatic down in production upgrades.
    }
};
