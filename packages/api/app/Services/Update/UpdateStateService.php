<?php

declare(strict_types=1);

namespace App\Services\Update;

use App\Services\Installer\InstallerEnvChecker;
use App\Support\AppVersion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class UpdateStateService
{
    public function __construct(
        private UpdateStateStore $store,
        private AppVersion $appVersion,
        private InstallerEnvChecker $env,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        $state = $this->store->read();
        $latest = isset($state['latest']) && is_array($state['latest']) ? $state['latest'] : null;
        $driver = Schema::connection('wgw')->getConnection()->getDriverName();
        $checks = $this->env->checkAll($driver === 'mysql' ? 'mysql' : 'sqlite');
        $compatible = $this->env->allPassed($checks);
        $inProgress = $this->store->isLocked();
        $phase = $inProgress && is_string($state['phase'] ?? null) ? $state['phase'] : null;
        $current = $inProgress && is_array($state['current'] ?? null) ? $state['current'] : null;
        $installedVersion = $this->appVersion->current();
        if ($inProgress && is_array($current) && is_string($current['from'] ?? null) && trim((string) $current['from']) !== '') {
            $installedVersion = trim((string) $current['from']);
        }

        return [
            'installedVersion' => $installedVersion,
            'schemaVersion' => $this->schemaVersion(),
            'latest' => $latest,
            'updateAvailable' => $this->isUpdateAvailable($installedVersion, $latest),
            'compatible' => $compatible,
            'backups' => $this->listBackups(),
            'checks' => $checks,
            'inProgress' => $inProgress,
            'phase' => $phase,
            'current' => $current,
            'download' => $inProgress && is_array($state['download'] ?? null) ? $state['download'] : null,
            'phaseProgress' => $inProgress && is_array($state['phase_progress'] ?? null) ? $state['phase_progress'] : null,
            'cancelRequested' => $inProgress && (bool) ($state['cancel_requested'] ?? false),
            'cancelAllowed' => $phase !== null && $this->isCancellablePhase($phase),
            'lastCheckedAt' => is_string($state['last_checked_at'] ?? null) ? $state['last_checked_at'] : null,
            'lastCheckError' => is_string($state['last_check_error'] ?? null) ? $state['last_check_error'] : null,
            'lastResult' => is_array($state['last_result'] ?? null) ? $state['last_result'] : null,
        ];
    }

    public function deleteBackup(string $name): array
    {
        $name = $this->ensureBackupName($name);
        $disk = $this->store->backupDir();
        $path = $disk.'/'.$name;
        $storage = app(\App\Storage\WgwStorage::class)->data();
        if (! $storage->exists($path) && ! $storage->directoryExists($path)) {
            throw new \InvalidArgumentException('Backup not found.');
        }
        if ($storage->directoryExists($path)) {
            $storage->deleteDirectory($path);
        } else {
            $storage->delete($path);
        }

        return $this->snapshot();
    }

    public function backupAbsolutePath(string $name): string
    {
        $name = $this->ensureBackupName($name);
        $storage = app(\App\Storage\WgwStorage::class)->data();
        $key = $this->store->backupDir().'/'.$name;
        if ($storage->directoryExists($key)) {
            throw new \InvalidArgumentException('Legacy backup folders are not directly downloadable. Use ZIP backups.');
        }
        if (! $storage->fileExists($key)) {
            throw new \InvalidArgumentException('Backup not found.');
        }

        return $storage->path($key);
    }

    private function schemaVersion(): int
    {
        if (! Schema::connection('wgw')->hasTable('app_migrations')) {
            return 0;
        }
        $max = DB::connection('wgw')->table('app_migrations')->max('version');

        return (int) ($max ?? 0);
    }

    /**
     * @param array<string, mixed>|null $latest
     */
    private function isUpdateAvailable(string $installed, ?array $latest): bool
    {
        if ($latest === null || ! isset($latest['version']) || ! is_string($latest['version'])) {
            return false;
        }

        return version_compare($latest['version'], $installed, '>');
    }

    private function isCancellablePhase(string $phase): bool
    {
        return in_array($phase, ['download', 'verify', 'backup', 'extract'], true);
    }

    private function ensureBackupName(string $name): string
    {
        $trimmed = trim($name);
        if ($trimmed === '' || preg_match('/^[A-Za-z0-9._-]+$/', $trimmed) !== 1) {
            throw new \InvalidArgumentException('Invalid backup file name.');
        }

        return $trimmed;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listBackups(): array
    {
        $storage = app(\App\Storage\WgwStorage::class)->data();
        $dir = $this->store->backupDir();
        if (! $storage->directoryExists($dir)) {
            return [];
        }

        $rows = [];
        foreach ($storage->files($dir) as $fileKey) {
            $item = basename($fileKey);
            if (! str_ends_with($item, '.zip')) {
                continue;
            }
            $mtime = $storage->lastModified($fileKey);
            $rows[] = [
                'name' => $item,
                'sizeBytes' => max(0, (int) ($storage->size($fileKey) ?? 0)),
                'modifiedAt' => is_int($mtime) ? date('c', $mtime) : null,
                'fromVersion' => null,
                'toVersion' => null,
                'format' => 'zip',
                'downloadable' => true,
            ];
        }

        foreach ($storage->directories($dir) as $dirKey) {
            $item = basename($dirKey);
            if (! str_starts_with($item, 'backup-')) {
                continue;
            }
            $mtime = $storage->lastModified($dirKey);
            $rows[] = [
                'name' => $item,
                'sizeBytes' => 0,
                'modifiedAt' => is_int($mtime) ? date('c', $mtime) : null,
                'fromVersion' => null,
                'toVersion' => null,
                'format' => 'legacy_dir',
                'downloadable' => false,
            ];
        }

        usort(
            $rows,
            static fn (array $a, array $b): int => strcmp((string) ($b['modifiedAt'] ?? ''), (string) ($a['modifiedAt'] ?? ''))
        );

        return $rows;
    }
}
