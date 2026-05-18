<?php

declare(strict_types=1);

namespace App\Support;

use App\LocalConfigFile;

/**
 * Install path resolution for the greenfield Laravel app (no legacy Config::load).
 */
final class WgwInstallConfig
{
    private ?string $installRoot = null;

    public function installRoot(): string
    {
        if ($this->installRoot !== null) {
            return $this->installRoot;
        }

        $fromEnv = getenv('WGW_APP_ROOT');
        if (is_string($fromEnv) && $fromEnv !== '' && is_dir($fromEnv)) {
            return $this->installRoot = $this->normalize($fromEnv);
        }

        $cwd = getcwd();
        if (is_string($cwd) && $this->looksLikeInstallRoot($cwd)) {
            return $this->installRoot = $this->normalize($cwd);
        }

        $monorepo = dirname(__DIR__, 4).'/apps/wegotworkspace';
        if (is_dir($monorepo) && $this->looksLikeInstallRoot($monorepo)) {
            return $this->installRoot = $this->normalize($monorepo);
        }

        return $this->installRoot = dirname(__DIR__, 2);
    }

    public function configFilePath(): string
    {
        return $this->installRoot().'/wgw-config.php';
    }

    public function dataDir(): string
    {
        $override = getenv('SABRE_DATA_DIR');
        if (is_string($override) && $override !== '') {
            return $this->resolvePath($override);
        }

        $file = $this->readInstallFileConfig();
        if (isset($file['data_dir']) && is_string($file['data_dir']) && $file['data_dir'] !== '') {
            return $this->resolvePath($file['data_dir']);
        }

        return $this->installRoot().'/wgw-content';
    }

    public function filesDir(): string
    {
        return rtrim($this->dataDir(), '/').'/files';
    }

    public function resolveInstallPath(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '') {
            return rtrim($this->dataDir(), '/').'/db.sqlite';
        }
        if ($this->isAbsolutePath($path)) {
            return rtrim($path, '/');
        }

        return rtrim($this->installRoot().'/'.ltrim($path, '/'), '/');
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

    /**
     * @return array<string, mixed>
     */
    public function readInstallFileConfig(): array
    {
        $path = $this->configFilePath();
        if (! is_readable($path)) {
            return [];
        }

        return LocalConfigFile::read($path);
    }

    private function resolvePath(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '') {
            return $this->installRoot();
        }
        if ($path[0] === '/') {
            return rtrim($path, '/');
        }

        return rtrim($this->installRoot().'/'.ltrim($path, '/'), '/');
    }

    private function looksLikeInstallRoot(string $dir): bool
    {
        $dir = rtrim(str_replace('\\', '/', $dir), '/');

        return is_file($dir.'/wgw-config.php')
            || is_file($dir.'/wgw-config.sample.php')
            || is_file($dir.'/index.php');
    }

    private function normalize(string $path): string
    {
        return rtrim(str_replace('\\', '/', $path), '/');
    }
}
