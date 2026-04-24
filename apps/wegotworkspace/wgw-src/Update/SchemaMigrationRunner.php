<?php

declare(strict_types=1);

namespace App\Update;

final class SchemaMigrationRunner
{
    public const CURRENT_SCHEMA_VERSION = 1;

    public static function migrate(\PDO $pdo): int
    {
        self::ensureMigrationTable($pdo);
        self::applyBuiltInMigrations($pdo);

        return self::currentVersion($pdo);
    }

    public static function currentVersion(\PDO $pdo): int
    {
        self::ensureMigrationTable($pdo);
        $stmt = $pdo->query('SELECT MAX(version) FROM app_migrations');
        if ($stmt === false) {
            return 0;
        }

        return (int) ($stmt->fetchColumn() ?: 0);
    }

    private static function ensureMigrationTable(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS app_migrations (
                    version INT NOT NULL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    applied_at VARCHAR(32) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS app_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            )'
        );
    }

    private static function applyBuiltInMigrations(\PDO $pdo): void
    {
        $current = self::currentVersion($pdo);
        if ($current >= 1) {
            return;
        }

        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS app_update_history (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    from_version VARCHAR(64) NOT NULL,
                    to_version VARCHAR(64) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    message TEXT NOT NULL,
                    created_at VARCHAR(32) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );
        } else {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS app_update_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_version TEXT NOT NULL,
                    to_version TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )'
            );
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([1, 'create_app_update_history', date('c')]);
    }
}
