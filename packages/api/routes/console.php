<?php

use App\Services\Contacts\GroupMemberUriBackfill;
use App\Services\Installer\DevInstallBootstrap;
use App\Services\Installer\InstallerJwtKeyGenerator;
use App\Services\Installer\WgwSchemaMigrator;
use App\Services\Tasks\InboxTaskListProvisioner;
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

Artisan::command('wgw:jwt-keys', function (InstallerJwtKeyGenerator $jwtKeys): int {
    $jwtKeys->ensureKeys();
    $this->info('JWT signing keys are ready under the install data directory (wgw-content/keys/).');

    return self::SUCCESS;
})->purpose('Create RSA JWT signing keys for local dev when missing (idempotent)');

Artisan::command('wgw:dev-install', function (DevInstallBootstrap $bootstrap): int {
    $fresh = $bootstrap->ensure();
    if ($fresh) {
        $user = strtolower(trim((string) (getenv('WGW_DEV_USERNAME') ?: 'admin')));
        $this->info("Local dev install ready (admin user: {$user}, default password: storybook-dev).");
    } else {
        $this->info('Local dev install already present — skipped.');
    }

    return self::SUCCESS;
})->purpose('Bootstrap wgw-config.php, SQLite, and admin user for Docker-free dev/preview (idempotent)');

Artisan::command('wgw:contacts:sanitize-group-member-uris', function (GroupMemberUriBackfill $backfill): int {
    $result = $backfill->run();
    $this->info(sprintf(
        'Scanned %d group card(s); updated %d with normalized member URIs.',
        $result['scanned'],
        $result['updated'],
    ));

    return self::SUCCESS;
})->purpose('Repair macOS-corrupt group member URIs in stored contact vCards');

Artisan::command('wgw:tasks:provision-inbox', function (InboxTaskListProvisioner $provisioner): int {
    $result = $provisioner->ensureForAllUsers();
    $this->info(sprintf(
        'Scanned %d user(s); created Inbox for %d; skipped %d (already present).',
        $result['scanned'],
        $result['created'],
        $result['skipped'],
    ));

    return self::SUCCESS;
})->purpose('Ensure each user has a VTODO-only Inbox task list (idempotent)');
