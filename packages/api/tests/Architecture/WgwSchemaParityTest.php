<?php

declare(strict_types=1);

namespace Tests\Architecture;

use Illuminate\Support\Facades\Schema;
use Tests\Support\WgwTestDatabase;
use Tests\TestCase;

final class WgwSchemaParityTest extends TestCase
{
    public function test_wgw_migrations_create_expected_tables(): void
    {
        WgwTestDatabase::setUpFreshSchema();

        foreach ([
            'users',
            'principals',
            'groupmembers',
            'app_settings',
            'mail_user_credentials',
            'calendarobjects',
            'cards',
            'app_update_history',
            'api_refresh_tokens',
            'api_revoked_tokens',
            'meet_peers',
            'meet_messages',
            'collab_peers',
            'collab_messages',
            'drive_starred_items',
            'search_documents',
            'search_terms',
        ] as $table) {
            $this->assertTrue(
                Schema::connection('wgw')->hasTable($table),
                "Expected wgw table {$table} after migrate:fresh (driver: ".WgwTestDatabase::driver().').',
            );
        }

        $this->assertTrue(Schema::connection('wgw')->hasColumn('meet_peers', 'owner_user'));
    }
}
