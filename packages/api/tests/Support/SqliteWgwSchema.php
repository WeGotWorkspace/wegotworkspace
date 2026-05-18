<?php

declare(strict_types=1);

namespace Tests\Support;

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
