<?php

declare(strict_types=1);

namespace App\Settings;

use App\Installer\SchemaRunner;

final class SettingsMigration
{
    public static function ensureTable(\PDO $pdo): void
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql' ? 'mysql' : 'sqlite';
        $file = $driver === 'mysql' ? 'mysql.settings.sql' : 'sqlite.settings.sql';
        $sql = trim(SchemaRunner::loadSql($driver, $file));
        if ($sql !== '') {
            $pdo->exec($sql);
        }
    }

    /**
     * If app_settings is empty, copy known keys from wgw-config.php (non-pdo keys only).
     *
     * @param array<string, mixed> $fileConfig full return array from wgw-config.php
     */
    public static function migrateIfEmpty(\PDO $pdo, array $fileConfig): void
    {
        self::ensureTable($pdo);
        if (SettingsRepository::count($pdo) > 0) {
            return;
        }
        $toInsert = [];
        foreach (SettingsKeys::all() as $key) {
            if (array_key_exists($key, $fileConfig)) {
                $toInsert[$key] = $fileConfig[$key];
            }
        }
        if ($toInsert !== []) {
            SettingsRepository::replaceManyDriver($pdo, $toInsert);
        }
    }
}
