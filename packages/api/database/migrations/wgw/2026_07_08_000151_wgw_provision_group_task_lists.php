<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use App\Services\Calendars\UserCalendarCollectionsProvisioner;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('principals') || ! $this->wgwHasTable('calendars')) {
            return;
        }

        app(UserCalendarCollectionsProvisioner::class)->ensureForAllGroups();
    }

    public function down(): void
    {
        // Data migration — provisioned collections remain after rollback.
    }
};
