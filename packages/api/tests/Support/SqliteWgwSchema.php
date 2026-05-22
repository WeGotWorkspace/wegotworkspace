<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Services\Installer\InstallerSchemaRunner;
use App\Support\AppPaths;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class SqliteWgwSchema
{
    public static function applyCoreTables(): void
    {
        Schema::connection('wgw')->dropIfExists('groupmembers');
        Schema::connection('wgw')->dropIfExists('app_settings');
        Schema::connection('wgw')->dropIfExists('principals');
        Schema::connection('wgw')->dropIfExists('users');

        DB::connection('wgw')->statement(
            'CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                username TEXT NOT NULL,
                digesta1 TEXT NOT NULL DEFAULT "",
                digest TEXT NOT NULL,
                UNIQUE(username)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE principals (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                uri TEXT NOT NULL,
                email TEXT,
                displayname TEXT,
                UNIQUE(uri)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE groupmembers (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                principal_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                UNIQUE(principal_id, member_id)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE app_settings (
                name TEXT NOT NULL PRIMARY KEY,
                value TEXT NOT NULL
            )'
        );
    }

    public static function applyMailTables(): void
    {
        Schema::connection('wgw')->dropIfExists('mail_user_credentials');
        DB::connection('wgw')->statement(
            'CREATE TABLE mail_user_credentials (
                username TEXT PRIMARY KEY,
                imap_username TEXT NOT NULL,
                password_enc TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )'
        );
    }

    public static function applyDriveTables(): void
    {
        Schema::connection('wgw')->dropIfExists('drive_starred_items');
        DB::connection('wgw')->statement(
            'CREATE TABLE drive_starred_items (
                username TEXT NOT NULL,
                path TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY(username, path)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE INDEX idx_drive_starred_user ON drive_starred_items(username)'
        );
    }

    public static function applyVoiceTables(): void
    {
        Schema::connection('wgw')->dropIfExists('voice_messages');
        Schema::connection('wgw')->dropIfExists('voice_peers');

        DB::connection('wgw')->statement(
            'CREATE TABLE voice_peers (
                room TEXT NOT NULL,
                peer_id TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT "",
                owner_user TEXT NOT NULL DEFAULT "",
                seen_at INTEGER NOT NULL,
                PRIMARY KEY(room, peer_id)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE voice_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room TEXT NOT NULL,
                from_peer TEXT NOT NULL,
                to_peer TEXT NOT NULL,
                type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE INDEX idx_voice_msg_target ON voice_messages(room, to_peer, id)'
        );
        DB::connection('wgw')->statement(
            'CREATE INDEX idx_voice_peers_room ON voice_peers(room)'
        );
    }

    public static function applySabreTables(): void
    {
        $runner = app(InstallerSchemaRunner::class);
        $pdo = DB::connection('wgw')->getPdo();
        foreach (['calendars.sql', 'addressbooks.sql', 'locks.sql', 'propertystorage.sql', 'settings.sql'] as $file) {
            $path = app(AppPaths::class)->installerSqlDir('sqlite').'/'.$file;
            $sql = trim((string) file_get_contents($path));
            if ($sql !== '') {
                $pdo->exec($sql);
            }
        }
    }

    public static function applyAuthTables(): void
    {
        Schema::connection('wgw')->dropIfExists('api_revoked_tokens');
        Schema::connection('wgw')->dropIfExists('api_refresh_tokens');

        DB::connection('wgw')->statement(
            'CREATE TABLE api_refresh_tokens (
                token_hash TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE api_revoked_tokens (
                jti TEXT PRIMARY KEY,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )'
        );
    }
}
