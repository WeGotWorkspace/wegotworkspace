<?php

declare(strict_types=1);

namespace Tests\Unit\Installer;

use App\Services\Installer\InstallerSchemaMigrationRunner;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class InstallerSchemaMigrationRunnerTest extends TestCase
{
    public function test_migrate_empty_database_reaches_current_version(): void
    {
        $pdo = LegacySchemaFixture::createSqlite();

        $version = InstallerSchemaMigrationRunner::migrate($pdo);

        $this->assertSame(InstallerSchemaMigrationRunner::CURRENT_SCHEMA_VERSION, $version);
        $this->assertSame(
            InstallerSchemaMigrationRunner::CURRENT_SCHEMA_VERSION,
            InstallerSchemaMigrationRunner::currentVersion($pdo),
        );
        $this->assertExpectedSchemaAtCurrentVersion($pdo);
    }

    public function test_migrate_is_idempotent_when_already_at_current_version(): void
    {
        $pdo = LegacySchemaFixture::createSqlite();
        InstallerSchemaMigrationRunner::migrate($pdo);

        $version = InstallerSchemaMigrationRunner::migrate($pdo);

        $this->assertSame(InstallerSchemaMigrationRunner::CURRENT_SCHEMA_VERSION, $version);
        $this->assertMigrationAuditTrail($pdo);
    }

    #[DataProvider('legacySchemaVersionsProvider')]
    public function test_migrate_from_legacy_schema_version_reaches_current(int $legacyVersion): void
    {
        $pdo = LegacySchemaFixture::createSqlite();
        LegacySchemaFixture::seedAtVersion($pdo, $legacyVersion);

        $this->assertSame($legacyVersion, InstallerSchemaMigrationRunner::currentVersion($pdo));

        $version = InstallerSchemaMigrationRunner::migrate($pdo);

        $this->assertSame(InstallerSchemaMigrationRunner::CURRENT_SCHEMA_VERSION, $version);
        $this->assertExpectedSchemaAtCurrentVersion($pdo);
        $this->assertMigrationAuditTrail($pdo);
    }

    public function test_migrate_v3_tolerates_existing_voice_peer_owner_column(): void
    {
        $pdo = LegacySchemaFixture::createSqlite();
        LegacySchemaFixture::seedAtVersion($pdo, 3);

        InstallerSchemaMigrationRunner::migrate($pdo);

        $this->assertSame(InstallerSchemaMigrationRunner::CURRENT_SCHEMA_VERSION, InstallerSchemaMigrationRunner::currentVersion($pdo));
        $this->assertTableHasColumn($pdo, 'voice_peers', 'owner_user');
    }

    /**
     * @return array<string, array{0: int}>
     */
    public static function legacySchemaVersionsProvider(): array
    {
        $cases = [];
        for ($version = 0; $version <= 4; $version++) {
            $cases['legacy_v'.$version] = [$version];
        }

        return $cases;
    }

    private function assertExpectedSchemaAtCurrentVersion(\PDO $pdo): void
    {
        foreach ([
            'app_migrations',
            'app_update_history',
            'voice_peers',
            'voice_messages',
            'api_refresh_tokens',
            'api_revoked_tokens',
            'drive_starred_items',
        ] as $table) {
            $this->assertTrue(self::tableExists($pdo, $table), "Expected table {$table} to exist.");
        }

        $this->assertTableHasColumn($pdo, 'voice_peers', 'owner_user');
    }

    private function assertMigrationAuditTrail(\PDO $pdo): void
    {
        $stmt = $pdo->query('SELECT version, name FROM app_migrations ORDER BY version ASC');
        $this->assertNotFalse($stmt);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $this->assertCount(InstallerSchemaMigrationRunner::CURRENT_SCHEMA_VERSION, $rows);

        $expectedNames = [
            1 => 'create_app_update_history',
            2 => 'create_voice_signaling_tables',
            3 => 'add_voice_peer_owner',
            4 => 'create_api_token_tables',
            5 => 'create_drive_starred_items',
        ];

        foreach ($rows as $row) {
            $version = (int) $row['version'];
            $this->assertArrayHasKey($version, $expectedNames);
            $this->assertSame($expectedNames[$version], $row['name']);
        }
    }

    private function assertTableHasColumn(\PDO $pdo, string $table, string $column): void
    {
        $stmt = $pdo->query('PRAGMA table_info('.$table.')');
        $this->assertNotFalse($stmt);
        $columns = array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'name');
        $this->assertContains($column, $columns, "Expected column {$table}.{$column}.");
    }

    private static function tableExists(\PDO $pdo, string $table): bool
    {
        $stmt = $pdo->prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
        $stmt->execute([$table]);

        return (bool) $stmt->fetchColumn();
    }
}
