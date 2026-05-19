<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Support\AppPaths;

final class InstallerEnvChecker
{
    public const MIN_PHP = '8.3.0';

    public function __construct(private AppPaths $paths)
    {
    }

    /**
     * @return list<array{ok: bool, label: string, detail: string}>
     */
    public function checkAll(string $dbDriver): array
    {
        $checks = [$this->phpVersion()];
        foreach (['pdo', 'dom', 'mbstring', 'json', 'ctype', 'iconv', 'simplexml'] as $ext) {
            $checks[] = $this->extension($ext);
        }
        $checks[] = $this->extension($dbDriver === 'mysql' ? 'pdo_mysql' : 'pdo_sqlite');
        $checks[] = $this->writable($this->paths->dataDir());
        $checks[] = $this->writable($this->paths->configDir());

        return $checks;
    }

    /**
     * @param list<array{ok: bool, label: string, detail: string}> $checks
     */
    public function allPassed(array $checks): bool
    {
        foreach ($checks as $check) {
            if (! $check['ok']) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{ok: bool, label: string, detail: string}
     */
    private function phpVersion(): array
    {
        $ok = version_compare(PHP_VERSION, self::MIN_PHP, '>=');

        return [
            'ok' => $ok,
            'label' => 'PHP version',
            'detail' => $ok ? PHP_VERSION : PHP_VERSION.' (need '.self::MIN_PHP.' or newer)',
        ];
    }

    /**
     * @return array{ok: bool, label: string, detail: string}
     */
    private function extension(string $name): array
    {
        $ok = extension_loaded($name);

        return [
            'ok' => $ok,
            'label' => 'Extension: '.$name,
            'detail' => $ok ? 'Loaded' : 'Missing',
        ];
    }

    /**
     * @return array{ok: bool, label: string, detail: string}
     */
    private function writable(string $path): array
    {
        if (! is_dir($path)) {
            @mkdir($path, 0775, true);
        }
        $ok = is_dir($path) && is_writable($path);

        return [
            'ok' => $ok,
            'label' => 'Writable: '.$path,
            'detail' => $ok ? 'Yes' : 'No — adjust permissions for the web server user',
        ];
    }
}
