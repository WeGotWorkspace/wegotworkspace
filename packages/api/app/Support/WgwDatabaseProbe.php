<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Laravel-backed database probes for installer flows and install readiness checks.
 */
final class WgwDatabaseProbe
{
    public function __construct(private WgwInstallConfig $install) {}

    /**
     * @param  array<string, mixed>  $db
     */
    public function applyInstallerDb(array $db): void
    {
        $this->ensureSqliteDatabaseFile($db);
        WgwConnectionConfigurator::applyFromInstallerDb($db);
    }

    /**
     * @param  array<string, mixed>  $db
     */
    public function pingInstallerDb(array $db): void
    {
        $this->applyInstallerDb($db);
        DB::connection('wgw')->selectOne('SELECT 1 AS ok');
    }

    /**
     * @param  array<string, mixed>  $db
     */
    public function installerDbHasUsers(array $db): bool
    {
        try {
            $this->applyInstallerDb($db);

            return User::query()->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    public function installConfigHasUsers(): bool
    {
        try {
            return User::query()->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    public function configuredDbHasUsers(): bool
    {
        try {
            return User::query()->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $db
     */
    private function ensureSqliteDatabaseFile(array $db): void
    {
        if (($db['driver'] ?? '') !== 'sqlite') {
            return;
        }

        $path = $this->install->resolveInstallPath(
            (string) ($db['sqlite_path'] ?? './wgw-content/db.sqlite'),
        );
        $dir = dirname($path);
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        if (! is_file($path)) {
            touch($path);
        }
    }
}
