<?php

declare(strict_types=1);

namespace Tests\Unit\Installer;

/**
 * Builds SQLite databases that mimic pre-migrate production schema versions.
 */
final class LegacySchemaFixture
{
    public static function createSqlite(): \PDO
    {
        return new \PDO('sqlite::memory:', null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
    }

    /**
     * @param  int<0, 5>  $version  Schema version already applied (0 = empty database).
     */
    public static function seedAtVersion(\PDO $pdo, int $version): void
    {
        if ($version < 0 || $version > 5) {
            throw new \InvalidArgumentException('Fixture version must be 0..5, got '.$version);
        }

        if ($version === 0) {
            return;
        }

        self::ensureMigrationTable($pdo);

        if ($version >= 1) {
            self::createV1State($pdo);
            self::recordMigration($pdo, 1, 'create_app_update_history');
        }

        if ($version >= 2) {
            self::createV2State($pdo);
            self::recordMigration($pdo, 2, 'create_voice_signaling_tables');
        }

        if ($version >= 3) {
            self::addV3VoicePeerOwnerColumn($pdo);
            self::recordMigration($pdo, 3, 'add_voice_peer_owner');
        }

        if ($version >= 4) {
            self::createV4State($pdo);
            self::recordMigration($pdo, 4, 'create_api_token_tables');
        }

        if ($version >= 5) {
            self::createV5State($pdo);
            self::recordMigration($pdo, 5, 'create_drive_starred_items');
        }
    }

    private static function ensureMigrationTable(\PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS app_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            )'
        );
    }

    private static function createV1State(\PDO $pdo): void
    {
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

    private static function createV2State(\PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS voice_peers (
                room TEXT NOT NULL,
                peer_id TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT "",
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

    private static function addV3VoicePeerOwnerColumn(\PDO $pdo): void
    {
        $pdo->exec('ALTER TABLE voice_peers ADD COLUMN owner_user TEXT NOT NULL DEFAULT ""');
    }

    private static function createV4State(\PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS api_refresh_tokens (
                token_hash TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS api_revoked_tokens (
                jti TEXT PRIMARY KEY,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )'
        );
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_api_refresh_expires ON api_refresh_tokens(expires_at)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_api_revoked_expires ON api_revoked_tokens(expires_at)');
    }

    private static function createV5State(\PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS drive_starred_items (
                username TEXT NOT NULL,
                path TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY(username, path)
            )'
        );
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_drive_starred_user ON drive_starred_items(username)');
    }

    private static function recordMigration(\PDO $pdo, int $version, string $name): void
    {
        $stmt = $pdo->prepare('INSERT OR REPLACE INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([$version, $name, '2020-01-01T00:00:00+00:00']);
    }
}
