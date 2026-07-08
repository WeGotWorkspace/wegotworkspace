<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use App\Services\Calendars\UserCalendarCollectionsProvisioner;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('users') || ! $this->wgwHasTable('calendars')) {
            return;
        }

        $provisioner = app(UserCalendarCollectionsProvisioner::class);
        $provisioner->ensureForAllUsers();
        $provisioner->ensureForAllGroups();
    }

    public function down(): void
    {
        // Data migration — provisioned collections remain after rollback.
    }
};
