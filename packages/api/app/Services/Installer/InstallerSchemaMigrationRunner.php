<?php

declare(strict_types=1);

namespace App\Services\Installer;

final class InstallerSchemaMigrationRunner
{
    public const CURRENT_SCHEMA_VERSION = 9;

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
            $current = 3;
        }

        if ($current < 4) {
            self::migrateV4CreateApiTokenTables($pdo);
            $current = 4;
        }

        if ($current < 5) {
            self::migrateV5CreateDriveStarTable($pdo);
            $current = 5;
        }

        if ($current < 6) {
            self::migrateV6CreateCollabTables($pdo);
            $current = 6;
        }

        if ($current < 7) {
            self::migrateV7CreateSearchIndexTables($pdo);
            $current = 7;
        }

        if ($current < 8) {
            self::migrateV8RenameVoiceToMeet($pdo);
        }

        if ($current < 9) {
            self::migrateV9RenameMeetRtcSettingsToRtc($pdo);
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
                'CREATE TABLE IF NOT EXISTS meet_peers (
                    room VARCHAR(64) NOT NULL,
                    peer_id VARCHAR(64) NOT NULL,
                    name VARCHAR(64) NOT NULL DEFAULT \'\',
                    seen_at BIGINT NOT NULL,
                    PRIMARY KEY(room, peer_id),
                    KEY idx_meet_peers_room (room)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS meet_messages (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    room VARCHAR(64) NOT NULL,
                    from_peer VARCHAR(64) NOT NULL,
                    to_peer VARCHAR(64) NOT NULL,
                    type VARCHAR(16) NOT NULL,
                    payload MEDIUMTEXT NOT NULL,
                    created_at BIGINT NOT NULL,
                    PRIMARY KEY(id),
                    KEY idx_meet_msg_target (room, to_peer, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        } else {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS meet_peers (
                    room TEXT NOT NULL,
                    peer_id TEXT NOT NULL,
                    name TEXT NOT NULL DEFAULT \'\',
                    seen_at INTEGER NOT NULL,
                    PRIMARY KEY(room, peer_id)
                )'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS meet_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room TEXT NOT NULL,
                    from_peer TEXT NOT NULL,
                    to_peer TEXT NOT NULL,
                    type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )'
            );
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_meet_msg_target ON meet_messages(room, to_peer, id)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_meet_peers_room ON meet_peers(room)');
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([2, 'create_voice_signaling_tables', date('c')]);
    }

    private static function migrateV3AddVoicePeerOwner(\PDO $pdo): void
    {
        $peerTable = self::resolveMeetPeerTable($pdo);
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        try {
            if ($driver === 'mysql') {
                $pdo->exec(
                    "ALTER TABLE {$peerTable}
                     ADD COLUMN owner_user VARCHAR(190) NOT NULL DEFAULT '' AFTER name"
                );
            } else {
                $pdo->exec("ALTER TABLE {$peerTable} ADD COLUMN owner_user TEXT NOT NULL DEFAULT ''");
            }
        } catch (\PDOException $e) {
            $msg = strtolower($e->getMessage());
            $duplicate = str_contains($msg, 'duplicate column') || str_contains($msg, 'already exists');
            if (! $duplicate) {
                throw $e;
            }
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([3, 'add_voice_peer_owner', date('c')]);
    }

    private static function migrateV4CreateApiTokenTables(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS api_refresh_tokens (
                    token_hash VARCHAR(128) NOT NULL PRIMARY KEY,
                    username VARCHAR(190) NOT NULL,
                    role VARCHAR(16) NOT NULL,
                    expires_at BIGINT NOT NULL,
                    revoked TINYINT(1) NOT NULL DEFAULT 0,
                    created_at BIGINT NOT NULL,
                    KEY idx_api_refresh_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS api_revoked_tokens (
                    jti VARCHAR(128) NOT NULL PRIMARY KEY,
                    expires_at BIGINT NOT NULL,
                    created_at BIGINT NOT NULL,
                    KEY idx_api_revoked_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        } else {
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

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([4, 'create_api_token_tables', date('c')]);
    }

    private static function migrateV5CreateDriveStarTable(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS drive_starred_items (
                    username VARCHAR(190) NOT NULL,
                    path VARBINARY(1024) NOT NULL,
                    created_at BIGINT NOT NULL,
                    PRIMARY KEY(username, path),
                    KEY idx_drive_starred_user (username)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        } else {
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

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([5, 'create_drive_starred_items', date('c')]);
    }

    private static function migrateV6CreateCollabTables(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS collab_peers (
                    room VARCHAR(190) NOT NULL,
                    peer_id VARCHAR(16) NOT NULL,
                    name VARCHAR(64) NOT NULL DEFAULT \'\',
                    owner_user VARCHAR(190) NOT NULL DEFAULT \'\',
                    seen_at BIGINT NOT NULL,
                    PRIMARY KEY(room, peer_id),
                    KEY idx_collab_peers_room (room)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS collab_messages (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    room VARCHAR(190) NOT NULL,
                    from_peer VARCHAR(16) NOT NULL,
                    to_peer VARCHAR(16) NOT NULL,
                    type VARCHAR(16) NOT NULL,
                    payload MEDIUMTEXT NOT NULL,
                    created_at BIGINT NOT NULL,
                    PRIMARY KEY(id),
                    KEY idx_collab_msg_target (room, to_peer, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        } else {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS collab_peers (
                    room TEXT NOT NULL,
                    peer_id TEXT NOT NULL,
                    name TEXT NOT NULL DEFAULT \'\',
                    owner_user TEXT NOT NULL DEFAULT \'\',
                    seen_at INTEGER NOT NULL,
                    PRIMARY KEY(room, peer_id)
                )'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS collab_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room TEXT NOT NULL,
                    from_peer TEXT NOT NULL,
                    to_peer TEXT NOT NULL,
                    type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )'
            );
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_collab_msg_target ON collab_messages(room, to_peer, id)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_collab_peers_room ON collab_peers(room)');
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([6, 'create_collab_signaling_tables', date('c')]);
    }

    private static function migrateV7CreateSearchIndexTables(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS search_documents (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    source_type VARCHAR(24) NOT NULL,
                    source_subtype VARCHAR(64) NULL,
                    source_key VARBINARY(1024) NOT NULL,
                    owner_username VARCHAR(190) NULL,
                    group_slug VARCHAR(190) NULL,
                    title VARCHAR(512) NULL,
                    extension VARCHAR(32) NULL,
                    category VARCHAR(64) NULL,
                    content_type VARCHAR(255) NULL,
                    size BIGINT UNSIGNED NULL,
                    created_at_ts BIGINT UNSIGNED NULL,
                    modified_at_ts BIGINT UNSIGNED NULL,
                    body_text MEDIUMTEXT NULL,
                    metadata_json MEDIUMTEXT NULL,
                    created_at VARCHAR(32) NOT NULL,
                    updated_at VARCHAR(32) NOT NULL,
                    PRIMARY KEY(id),
                    UNIQUE KEY uniq_search_source (source_type, source_key),
                    KEY idx_search_owner (owner_username),
                    KEY idx_search_group (group_slug),
                    KEY idx_search_type_mtime (source_type, modified_at_ts)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS search_terms (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    document_id BIGINT UNSIGNED NOT NULL,
                    token VARCHAR(120) NOT NULL,
                    field VARCHAR(24) NOT NULL DEFAULT \'body\',
                    weight SMALLINT UNSIGNED NOT NULL DEFAULT 1,
                    created_at VARCHAR(32) NOT NULL,
                    updated_at VARCHAR(32) NOT NULL,
                    PRIMARY KEY(id),
                    UNIQUE KEY uniq_search_term_doc_token_field (document_id, token, field),
                    KEY idx_search_token_field (token, field),
                    CONSTRAINT fk_search_terms_document
                        FOREIGN KEY (document_id) REFERENCES search_documents(id)
                        ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
        } else {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS search_documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_type TEXT NOT NULL,
                    source_subtype TEXT NULL,
                    source_key TEXT NOT NULL,
                    owner_username TEXT NULL,
                    group_slug TEXT NULL,
                    title TEXT NULL,
                    extension TEXT NULL,
                    category TEXT NULL,
                    content_type TEXT NULL,
                    size INTEGER NULL,
                    created_at_ts INTEGER NULL,
                    modified_at_ts INTEGER NULL,
                    body_text TEXT NULL,
                    metadata_json TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS search_terms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER NOT NULL,
                    token TEXT NOT NULL,
                    field TEXT NOT NULL DEFAULT \'body\',
                    weight INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(document_id) REFERENCES search_documents(id) ON DELETE CASCADE
                )'
            );
            $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS uniq_search_source ON search_documents(source_type, source_key)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_search_owner ON search_documents(owner_username)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_search_group ON search_documents(group_slug)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_search_type_mtime ON search_documents(source_type, modified_at_ts)');
            $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS uniq_search_term_doc_token_field ON search_terms(document_id, token, field)');
            $pdo->exec('CREATE INDEX IF NOT EXISTS idx_search_token_field ON search_terms(token, field)');
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([7, 'create_unified_search_tables', date('c')]);
    }

    private static function migrateV8RenameVoiceToMeet(\PDO $pdo): void
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if (self::tableExists($pdo, 'voice_peers') && ! self::tableExists($pdo, 'meet_peers')) {
            if ($driver === 'mysql') {
                if (self::tableExists($pdo, 'voice_messages')) {
                    $pdo->exec('RENAME TABLE voice_peers TO meet_peers, voice_messages TO meet_messages');
                } else {
                    $pdo->exec('RENAME TABLE voice_peers TO meet_peers');
                }
            } else {
                $pdo->exec('ALTER TABLE voice_peers RENAME TO meet_peers');
                if (self::tableExists($pdo, 'voice_messages')) {
                    $pdo->exec('ALTER TABLE voice_messages RENAME TO meet_messages');
                }
            }
        }

        $settingRenames = [
            'voice_stun_url' => 'meet_stun_url',
            'voice_turn_url' => 'meet_turn_url',
            'voice_turn_username' => 'meet_turn_username',
            'voice_turn_credential' => 'meet_turn_credential',
        ];
        if (self::tableExists($pdo, 'app_settings')) {
            foreach ($settingRenames as $from => $to) {
                $stmt = $pdo->prepare('UPDATE app_settings SET name = ? WHERE name = ?');
                $stmt->execute([$to, $from]);
            }
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([8, 'rename_voice_to_meet', date('c')]);
    }

    private static function migrateV9RenameMeetRtcSettingsToRtc(\PDO $pdo): void
    {
        if (! self::tableExists($pdo, 'app_settings')) {
            $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
            $stmt->execute([9, 'rename_meet_rtc_settings_to_rtc', date('c')]);

            return;
        }

        $settingRenames = [
            'meet_stun_url' => 'rtc_stun_url',
            'meet_turn_url' => 'rtc_turn_url',
            'meet_turn_username' => 'rtc_turn_username',
            'meet_turn_credential' => 'rtc_turn_credential',
        ];
        foreach ($settingRenames as $from => $to) {
            $stmt = $pdo->prepare('UPDATE app_settings SET name = ? WHERE name = ?');
            $stmt->execute([$to, $from]);
        }

        $stmt = $pdo->prepare('INSERT INTO app_migrations (version, name, applied_at) VALUES (?, ?, ?)');
        $stmt->execute([9, 'rename_meet_rtc_settings_to_rtc', date('c')]);
    }

    private static function resolveMeetPeerTable(\PDO $pdo): string
    {
        if (self::tableExists($pdo, 'meet_peers')) {
            return 'meet_peers';
        }
        if (self::tableExists($pdo, 'voice_peers')) {
            return 'voice_peers';
        }

        throw new \RuntimeException('Missing meet/voice peers table for schema migration v3.');
    }

    private static function tableExists(\PDO $pdo, string $table): bool
    {
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $pdo->prepare(
                'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1'
            );
            $stmt->execute([$table]);

            return $stmt->fetchColumn() !== false;
        }

        $stmt = $pdo->prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1");
        $stmt->execute([$table]);

        return $stmt->fetchColumn() !== false;
    }
}
