<?php

declare(strict_types=1);

namespace App\Support;

final class AppPaths
{
    public function __construct(private WgwInstallConfig $install) {}

    public function installRoot(): string
    {
        return $this->install->installRoot();
    }

    public function dataDir(): string
    {
        return $this->install->dataDir();
    }

    public function lockFile(): string
    {
        return rtrim($this->dataDir(), '/').'/.installed';
    }

    public function maintenanceFile(): string
    {
        return rtrim($this->dataDir(), '/').'/.maintenance';
    }

    public function isInstalled(): bool
    {
        if (! is_file($this->lockFile())) {
            return false;
        }

        if (! is_readable($this->install->configFilePath())) {
            return false;
        }

        return $this->jwtKeysReady() && $this->databaseReady();
    }

    public function jwtPrivateKeyPath(): string
    {
        return rtrim($this->dataDir(), '/').'/keys/api-jwt-private.pem';
    }

    public function jwtPublicKeyPath(): string
    {
        return rtrim($this->dataDir(), '/').'/keys/api-jwt-public.pem';
    }

    public function jwtKeysReady(): bool
    {
        foreach ([$this->jwtPrivateKeyPath(), $this->jwtPublicKeyPath()] as $path) {
            if (! is_readable($path) || ! is_file($path) || filesize($path) < 32) {
                return false;
            }
        }

        return true;
    }

    public function databaseReady(): bool
    {
        $path = $this->configuredSqlitePath();
        if ($path === null || ! is_file($path) || filesize($path) < 1) {
            return false;
        }

        try {
            $pdo = new \PDO('sqlite:'.$path, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);
            $users = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();

            return (int) $users > 0;
        } catch (\Throwable) {
            return false;
        }
    }

    public function clearStaleInstallLock(): void
    {
        if (is_file($this->lockFile()) && ! $this->isInstalled()) {
            @unlink($this->lockFile());
        }
    }

    private function configuredSqlitePath(): ?string
    {
        $cfg = $this->install->readInstallFileConfig();
        $pdo = $cfg['pdo'] ?? null;
        if (! is_array($pdo)) {
            return rtrim($this->dataDir(), '/').'/db.sqlite';
        }
        if (isset($pdo['sqlite_file']) && is_string($pdo['sqlite_file']) && trim($pdo['sqlite_file']) !== '') {
            return $this->install->resolveInstallPath(trim($pdo['sqlite_file']));
        }
        if (isset($pdo['dsn']) && is_string($pdo['dsn']) && str_starts_with(trim($pdo['dsn']), 'sqlite:')) {
            return substr(trim($pdo['dsn']), 7);
        }

        return rtrim($this->dataDir(), '/').'/db.sqlite';
    }

    public function isMaintenance(): bool
    {
        return is_file($this->maintenanceFile());
    }

    public function configDir(): string
    {
        return $this->installRoot();
    }

    public function installerSqlDir(string $driver): string
    {
        return dirname(__DIR__, 2).'/resources/installer/sql/'.$driver;
    }

    public function defaultSqliteRelativePath(): string
    {
        return './wgw-content/db.sqlite';
    }

    public function resolveProjectPath(string $path): string
    {
        return $this->install->resolveInstallPath($path);
    }

    public function tryRelativeToInstallRoot(string $absolute): ?string
    {
        $root = rtrim(str_replace('\\', '/', $this->installRoot()), '/');
        $absolute = rtrim(str_replace('\\', '/', $absolute), '/');
        if ($absolute === $root) {
            return '.';
        }
        $prefix = $root.'/';
        if (! str_starts_with($absolute, $prefix)) {
            return null;
        }

        return './'.ltrim(substr($absolute, strlen($prefix)), '/');
    }

    public function appDistIndex(string $app): ?string
    {
        $root = $this->moduleDistRoot($app);

        return $root !== null ? $root.'/index.html' : null;
    }

    public function moduleDistRoot(string $module): ?string
    {
        foreach ($this->moduleDistCandidates($module) as $candidate) {
            if (is_file($candidate.'/index.html')) {
                return $candidate;
            }
        }

        return null;
    }

    public function shellDistRoot(): ?string
    {
        return $this->moduleDistRoot('shell');
    }

    /**
     * @return list<string>
     */
    private function moduleDistCandidates(string $module): array
    {
        $root = $this->installRoot();
        $repo = dirname($root, 2);

        $candidates = [
            $repo.'/packages/apps/'.$module.'/dist',
            $root.'/packages/apps/'.$module.'/dist',
        ];

        if ($module === 'shell') {
            $candidates[] = $repo.'/packages/apps/dist';
            $candidates[] = $root.'/packages/apps/dist';
        }

        return array_values(array_unique($candidates));
    }

    public function officeIndex(): ?string
    {
        foreach ($this->officeIndexCandidates() as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    public function officeEditorReady(): bool
    {
        foreach ($this->officeBuildRoots() as $root) {
            if (is_readable($root.'/editor.html')) {
                return true;
            }
            if (is_readable($root.'/editor/index.html')) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function officeBuildRoots(): array
    {
        $roots = [];
        foreach ($this->officeIndexCandidates() as $index) {
            $roots[] = dirname($index);
        }

        return array_values(array_unique($roots));
    }

    /**
     * @return list<string>
     */
    private function privateDirCandidates(): array
    {
        $root = $this->installRoot();
        $repo = dirname($root, 2);

        return array_values(array_unique([
            $repo.'/packages/apps',
            $root.'/packages/apps',
        ]));
    }

    /**
     * @return list<string>
     */
    private function officeIndexCandidates(): array
    {
        $root = $this->installRoot();
        $repo = dirname($root, 2);

        return [
            $repo.'/packages/apps/office/build/index.html',
            $root.'/packages/apps/office/build/index.html',
        ];
    }
}
