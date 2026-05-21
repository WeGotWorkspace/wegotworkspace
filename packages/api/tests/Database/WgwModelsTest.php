<?php

declare(strict_types=1);

namespace Tests\Database;

use App\Models\AppSetting;
use App\Models\GroupMember;
use App\Models\Principal;
use App\Models\User;
use App\Support\WgwDatabaseConfig;
use Illuminate\Support\Facades\DB;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class WgwModelsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('wgw');
        SqliteWgwSchema::applyCoreTables();
    }

    public function test_user_and_principal_round_trip(): void
    {
        $user = User::query()->create([
            'username' => 'alice',
            'digest' => '$2y$10$abcdefghijklmnopqrstuv',
            'digesta1' => '',
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);

        $this->assertSame('principals/alice', $user->principalUri());
        $principal = $user->principal();
        $this->assertNotNull($principal);
        $this->assertSame('Alice', $principal->displayname);
    }

    public function test_app_setting_encode_decode(): void
    {
        AppSetting::setValue('site_name', 'WeGotWorkspace');
        AppSetting::setValue('calendar_enabled', true);
        AppSetting::setValue('admin_usernames', ['alice', 'bob']);

        $this->assertSame('WeGotWorkspace', AppSetting::getValue('site_name'));
        $this->assertTrue(AppSetting::getValue('calendar_enabled'));
        $this->assertSame(['alice', 'bob'], AppSetting::getValue('admin_usernames'));
    }

    public function test_group_member_links_principals(): void
    {
        $group = Principal::query()->create([
            'uri' => 'principals/groups/team',
            'displayname' => 'Team',
        ]);
        $member = Principal::query()->create([
            'uri' => 'principals/alice',
            'displayname' => 'Alice',
        ]);
        GroupMember::query()->create([
            'principal_id' => $group->id,
            'member_id' => $member->id,
        ]);

        $this->assertCount(1, $group->groupMembers);
        $this->assertSame('principals/alice', $group->groupMembers->first()?->uri);
    }

    public function test_wgw_connection_uses_install_config_when_present(): void
    {
        $config = $this->app->make(WgwDatabaseConfig::class)->connectionConfig();
        $this->assertSame('sqlite', $config['driver']);
        $this->assertArrayHasKey('database', $config);
    }
}
