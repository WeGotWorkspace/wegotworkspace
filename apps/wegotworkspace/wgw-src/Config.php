<?php

declare(strict_types=1);

namespace App;

use App\Admin\AdminAccessMigration;
use App\Settings\SettingsDefaults;
use App\Settings\SettingsMigration;
use App\Settings\SettingsRepository;
use App\Update\SchemaMigrationRunner;

final class Config
{
    /** @var array<string, mixed>|null */
    private static ?array $cache = null;

    public static function resetCache(): void
    {
        self::$cache = null;
    }

    /**
     * Merges defaults, `app_settings` (authoritative), and `pdo` from `wgw-config.php`.
     *
     * @return array<string, mixed>
     */
    public static function load(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $path = Paths::localConfig();
        if (!is_readable($path)) {
            throw new \RuntimeException('Missing configuration. Run the web installer first.');
        }

        $fileCfg = LocalConfigFile::read($path);
        if (!isset($fileCfg['pdo']) || !is_array($fileCfg['pdo'])) {
            throw new \RuntimeException('Invalid configuration file format.');
        }

        $pdoCfg = self::pdoCredentials($fileCfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );

        SettingsMigration::ensureTable($pdo);
        SettingsMigration::migrateIfEmpty($pdo, $fileCfg);
        AdminAccessMigration::run($pdo);
        SchemaMigrationRunner::migrate($pdo);

        $dbRaw = SettingsRepository::fetchAll($pdo);
        $normalized = SettingsDefaults::normalize($dbRaw);
        $normalized['pdo'] = $fileCfg['pdo'] ?? [];

        self::$cache = $normalized;

        return self::$cache;
    }

    /**
     * Read wgw-config.php only (no database). Used before install completes.
     *
     * @return array<string, mixed>
     */
    public static function loadFileOnly(): array
    {
        $path = Paths::localConfig();
        if (!is_readable($path)) {
            throw new \RuntimeException('Missing configuration. Run the web installer first.');
        }

        $cfg = LocalConfigFile::read($path);
        if (!isset($cfg['pdo']) || !is_array($cfg['pdo'])) {
            throw new \RuntimeException('Invalid configuration file format.');
        }

        return $cfg;
    }

    /**
     * Normalized PDO constructor arguments. Supports portable SQLite via `sqlite_file`
     * (path relative to project root) and legacy `dsn` for SQLite or MySQL.
     *
     * @param array<string, mixed> $cfg full or partial config containing `pdo`
     *
     * @return array{dsn: string, user: ?string, password: ?string}
     */
    public static function pdoCredentials(array $cfg): array
    {
        $pdo = $cfg['pdo'] ?? null;
        if (!is_array($pdo)) {
            throw new \RuntimeException('Invalid or missing pdo configuration.');
        }

        if (isset($pdo['sqlite_file']) && is_string($pdo['sqlite_file']) && $pdo['sqlite_file'] !== '') {
            $abs = Paths::resolveProjectPath($pdo['sqlite_file']);

            return [
                'dsn' => 'sqlite:'.$abs,
                'user' => null,
                'password' => null,
            ];
        }

        $dsn = (string) ($pdo['dsn'] ?? '');
        if ($dsn === '') {
            throw new \RuntimeException('Invalid or missing pdo.dsn / pdo.sqlite_file configuration.');
        }

        if (str_starts_with($dsn, 'sqlite:')) {
            $file = substr($dsn, 7);
            if ($file !== '' && !Paths::isAbsoluteFilesystemPath($file)) {
                $dsn = 'sqlite:'.Paths::resolveProjectPath($file);
            }
        }

        return [
            'dsn' => $dsn,
            'user' => $pdo['user'] ?? null,
            'password' => $pdo['password'] ?? null,
        ];
    }
}
