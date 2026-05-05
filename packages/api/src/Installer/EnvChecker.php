<?php

declare(strict_types=1);

namespace App\Installer;

use App\Paths;

final class EnvChecker
{
    public const MIN_PHP = '8.1.0';

    /**
     * @return list<array{ok: bool, label: string, detail: string}>
     */
    public static function checkAll(string $dbDriver): array
    {
        $checks = [];
        $checks[] = self::phpVersion();
        foreach (['pdo', 'dom', 'mbstring', 'json', 'ctype', 'iconv', 'simplexml'] as $ext) {
            $checks[] = self::extension($ext);
        }
        if ($dbDriver === 'sqlite') {
            $checks[] = self::extension('pdo_sqlite');
        } else {
            $checks[] = self::extension('pdo_mysql');
        }
        $checks[] = self::writable(Paths::data());
        $checks[] = self::writable(Paths::configDir());

        return $checks;
    }

    /**
     * @return array{ok: bool, label: string, detail: string}
     */
    public static function phpVersion(): array
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
    public static function extension(string $name): array
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
    public static function writable(string $path): array
    {
        if (!is_dir($path)) {
            @mkdir($path, 0775, true);
        }
        $ok = is_dir($path) && is_writable($path);

        return [
            'ok' => $ok,
            'label' => 'Writable: '.$path,
            'detail' => $ok ? 'Yes' : 'No — adjust permissions for the web server user',
        ];
    }

    /**
     * @param list<array{ok: bool, label: string, detail: string}> $checks
     */
    public static function allPassed(array $checks): bool
    {
        foreach ($checks as $c) {
            if (!$c['ok']) {
                return false;
            }
        }

        return true;
    }
}
