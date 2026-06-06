<?php

use App\Services\Installer\WgwSchemaMigrator;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('wgw:schema-migrate', function (WgwSchemaMigrator $migrator): int {
    $before = $migrator->currentVersion();
    $migrator->migrate();
    $after = $migrator->currentVersion();

    if ($after === $before) {
        $this->info("WGW schema already at version {$after}.");

        return self::SUCCESS;
    }

    $this->info("WGW schema migrated {$before} → {$after}.");

    return self::SUCCESS;
})->purpose('Apply pending database/migrations/wgw migrations on the wgw connection');
