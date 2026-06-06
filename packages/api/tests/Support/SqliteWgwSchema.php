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

    public static function applySearchTables(): void
    {
        Schema::connection('wgw')->dropIfExists('search_terms');
        Schema::connection('wgw')->dropIfExists('search_documents');

        DB::connection('wgw')->statement(
            'CREATE TABLE search_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                source_type TEXT NOT NULL,
                source_subtype TEXT,
                source_key TEXT NOT NULL,
                owner_username TEXT,
                group_slug TEXT,
                title TEXT,
                extension TEXT,
                category TEXT,
                content_type TEXT,
                size INTEGER,
                created_at_ts INTEGER,
                modified_at_ts INTEGER,
                body_text TEXT,
                metadata_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )'
        );
        DB::connection('wgw')->statement('CREATE UNIQUE INDEX uniq_search_source ON search_documents(source_type, source_key)');
        DB::connection('wgw')->statement('CREATE INDEX idx_search_owner ON search_documents(owner_username)');
        DB::connection('wgw')->statement('CREATE INDEX idx_search_group ON search_documents(group_slug)');
        DB::connection('wgw')->statement('CREATE INDEX idx_search_type_mtime ON search_documents(source_type, modified_at_ts)');
        DB::connection('wgw')->statement(
            'CREATE TABLE search_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                document_id INTEGER NOT NULL,
                token TEXT NOT NULL,
                field TEXT NOT NULL DEFAULT "body",
                weight INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(document_id) REFERENCES search_documents(id) ON DELETE CASCADE
            )'
        );
        DB::connection('wgw')->statement('CREATE UNIQUE INDEX uniq_search_term_doc_token_field ON search_terms(document_id, token, field)');
        DB::connection('wgw')->statement('CREATE INDEX idx_search_token_field ON search_terms(token, field)');
    }

    public static function applyCollabTables(): void
    {
        Schema::connection('wgw')->dropIfExists('collab_messages');
        Schema::connection('wgw')->dropIfExists('collab_peers');

        DB::connection('wgw')->statement(
            'CREATE TABLE collab_peers (
                room TEXT NOT NULL,
                peer_id TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT "",
                owner_user TEXT NOT NULL DEFAULT "",
                seen_at INTEGER NOT NULL,
                PRIMARY KEY(room, peer_id)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE collab_messages (
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
            'CREATE INDEX idx_collab_msg_target ON collab_messages(room, to_peer, id)'
        );
        DB::connection('wgw')->statement(
            'CREATE INDEX idx_collab_peers_room ON collab_peers(room)'
        );
    }

    public static function applyMeetTables(): void
    {
        Schema::connection('wgw')->dropIfExists('meet_messages');
        Schema::connection('wgw')->dropIfExists('meet_peers');

        DB::connection('wgw')->statement(
            'CREATE TABLE meet_peers (
                room TEXT NOT NULL,
                peer_id TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT "",
                owner_user TEXT NOT NULL DEFAULT "",
                seen_at INTEGER NOT NULL,
                PRIMARY KEY(room, peer_id)
            )'
        );
        DB::connection('wgw')->statement(
            'CREATE TABLE meet_messages (
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
            'CREATE INDEX idx_meet_msg_target ON meet_messages(room, to_peer, id)'
        );
        DB::connection('wgw')->statement(
            'CREATE INDEX idx_meet_peers_room ON meet_peers(room)'
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
        self::applySearchTables();
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
