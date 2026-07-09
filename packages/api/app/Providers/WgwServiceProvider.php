<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Installer\WgwConfigMigrator;
use App\Storage\NoteStoragePaths;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use App\Support\WgwDatabaseProbe;
use App\Support\WgwInstallConfig;
use App\Support\WgwRuntimeEnvBridge;
use Illuminate\Support\ServiceProvider;

final class WgwServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(WgwInstallConfig::class);
        $this->app->singleton(WgwDatabaseProbe::class);
        $this->app->singleton(StoragePaths::class);
        $this->app->singleton(NoteStoragePaths::class);
        $this->app->singleton(WgwStorage::class);
    }

    public function boot(): void
    {
        $this->app->make(WgwConfigMigrator::class)->migrateIfNeeded(clearConfig: false);
        WgwRuntimeEnvBridge::apply($this->app->make(WgwInstallConfig::class));

        $install = $this->app->make(WgwInstallConfig::class);
        $data = rtrim($install->dataDir(), '/');
        $files = rtrim($install->filesDir(), '/');

        $wgw = (array) config('database.connections.wgw', []);
        if (($wgw['driver'] ?? '') === 'sqlite') {
            $database = (string) ($wgw['database'] ?? '');
            if ($database !== '' && $database !== ':memory:' && ! $this->isAbsolutePath($database)) {
                $wgw['database'] = $install->resolveInstallPath($database);
            }
        }

        config([
            'wgw.data_dir' => $data,
            'filesystems.disks.wgw_data.root' => $data,
            'filesystems.disks.wgw_files.root' => $files,
            'filesystems.disks.wgw_notes.root' => $files,
            'database.connections.wgw' => $wgw,
        ]);
    }

    private function isAbsolutePath(string $path): bool
    {
        if ($path !== '' && $path[0] === '/') {
            return true;
        }

        return \PHP_OS_FAMILY === 'Windows'
            && strlen($path) > 2
            && ctype_alpha($path[0])
            && $path[1] === ':';
    }
}
