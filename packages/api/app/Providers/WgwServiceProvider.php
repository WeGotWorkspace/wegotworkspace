<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\WgwDatabaseConfig;
use App\Support\WgwInstallConfig;
use App\Storage\NoteStoragePaths;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use Illuminate\Support\ServiceProvider;

final class WgwServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(WgwInstallConfig::class);
        $this->app->singleton(WgwDatabaseConfig::class);
        $this->app->singleton(StoragePaths::class);
        $this->app->singleton(NoteStoragePaths::class);
        $this->app->singleton(WgwStorage::class);
    }

    public function boot(): void
    {
        $install = $this->app->make(WgwInstallConfig::class);
        $data = rtrim($install->dataDir(), '/');
        $files = rtrim($install->filesDir(), '/');
        $db = $this->app->make(WgwDatabaseConfig::class)->connectionConfig();

        config([
            'filesystems.disks.wgw_data.root' => $data,
            'filesystems.disks.wgw_files.root' => $files,
            'filesystems.disks.wgw_notes.root' => $files,
            'database.connections.wgw' => array_merge(
                (array) config('database.connections.wgw', []),
                $db
            ),
        ]);
    }
}
