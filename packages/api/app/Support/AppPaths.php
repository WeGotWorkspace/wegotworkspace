<?php

declare(strict_types=1);

namespace App\Support;

final class AppPaths
{
    public function __construct(private WgwInstallConfig $install)
    {
    }

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
        return is_file($this->lockFile());
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
        $relative = $app.'/dist/index.html';
        foreach ($this->privateDirCandidates() as $base) {
            $path = $base.'/'.$relative;
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
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

    /**
     * @return list<string>
     */
    private function privateDirCandidates(): array
    {
        $root = $this->installRoot();
        $repo = dirname($root, 2);

        return array_values(array_unique([
            $root.'/packages/apps',
            $repo.'/packages/apps',
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
            $root.'/packages/apps/office/build/index.html',
            $repo.'/packages/apps/office/build/index.html',
        ];
    }
}
