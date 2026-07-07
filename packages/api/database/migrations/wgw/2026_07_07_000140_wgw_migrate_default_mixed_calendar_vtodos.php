<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use App\Services\Tasks\DefaultMixedCalendarMigrator;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('users') || ! $this->wgwHasTable('calendars')) {
            return;
        }

        app(DefaultMixedCalendarMigrator::class)->migrateAllUsers();
    }

    public function down(): void
    {
        // Data migration — moved VTODOs remain in Inbox after rollback.
    }
};
