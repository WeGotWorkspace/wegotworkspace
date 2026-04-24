<?php

declare(strict_types=1);

namespace App\Update;

final class SchemaMigrationRunner
{
    public const CURRENT_SCHEMA_VERSION = 3;

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
        if ($current < 1) {
            self::migrateV1CreateUpdateHistory($pdo);
            $current = 1;
        }

        if ($current < 2) {
            self::migrateV2CreateVoiceTables($pdo);
            $current = 2;
        }

        if ($current < 3) {
            self::migrateV3AddVoicePeerOwner($pdo);
        }
    }

    private static function migrateV1CreateUpdateHistory(\PDO $pdo): void
    {
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

    private static function migrateV2CreateVoiceTables(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS voice_peers (
                    room VARCHAR(64) NOT NULL,
                    peer_id VARCHAR(64) NOT NULL,
                    name VARCHAR(64) NOT NULL DEFAULT \'\',
                    seen_at BIGINT NOT NULL,
                    PRIMARY KEY(room, peer_id),
                    KEY idx_voice_peers_room (room)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS voice_messages (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    room VARCHAR(64) NOT NULL,
                    from_peer VARCHAR(64) NOT NULL,
                    to_peer VARCHAR(64) NOT NULL,
                    type VARCHAR(16) NOT NULL,
                    payload MEDIUMTEXT NOT NULL,
                    created_at BIGINT NOT NULL,
                    PRIMARY KEY(id),
                    KEY idx_voice_msg_target (room, to_peer, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        } else {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS voice_peers (
                    room TEXT NOT NULL,
                    peer_id TEXT NOT NULL,
                    name TEXT NOT NULL DEFAULT \'\',
                    seen_at INTEGER NOT NULL,
                    PRIMARY KEY(room, peer_id)
                )'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS voice_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room TEXT NOT NULL,
                    from_peer TEXT NOT NULL,
                    to_peer TEXT NOT NULL,
                    type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )'
            );
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_voice_msg_target ON voice_messages(room, to_peer, id)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_voice_peers_room ON voice_peers(room)');
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([2, 'create_voice_signaling_tables', date('c')]);
    }

    private static function migrateV3AddVoicePeerOwner(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        try {
            if ($driver === 'mysql') {
                $pdo->exec(
                    'ALTER TABLE voice_peers
                     ADD COLUMN owner_user VARCHAR(190) NOT NULL DEFAULT \'\' AFTER name'
                );
            } else {
                $pdo->exec('ALTER TABLE voice_peers ADD COLUMN owner_user TEXT NOT NULL DEFAULT \'\'');
            }
        } catch (\PDOException $e) {
            $msg = strtolower($e->getMessage());
            $duplicate = str_contains($msg, 'duplicate column') || str_contains($msg, 'already exists');
            if (!$duplicate) {
                throw $e;
            }
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([3, 'add_voice_peer_owner', date('c')]);
    }
}
