<?php

declare(strict_types=1);

namespace Tests\Database;

use App\LocalConfigFile;
use App\Models\AppSetting;
use App\Models\AppUpdateHistory;
use App\Models\GroupMember;
use App\Models\Principal;
use App\Models\User;
use App\Support\WgwDatabaseConfig;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwInstallFixture;

final class WgwModelsTest extends WgwDatabaseTestCase
{
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

    public function test_app_update_history_records_upgrade_event(): void
    {
        AppUpdateHistory::query()->create([
            'from_version' => '1.0.0',
            'to_version' => '1.1.0',
            'status' => 'success',
            'message' => 'Update applied successfully.',
            'created_at' => '2026-06-06T12:00:00+00:00',
        ]);

        $row = AppUpdateHistory::query()->first();
        $this->assertNotNull($row);
        $this->assertSame('1.0.0', $row->from_version);
        $this->assertSame('success', $row->status);
    }

    public function test_wgw_connection_uses_install_config_when_present(): void
    {
        $installRoot = sys_get_temp_dir().'/wgw-models-config-'.uniqid('', true);
        mkdir($installRoot, 0775, true);
        mkdir($installRoot.'/wgw-content', 0775, true);

        putenv('WGW_APP_ROOT='.$installRoot);
        $_ENV['WGW_APP_ROOT'] = $installRoot;
        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();

        file_put_contents($installRoot.'/wgw-config.php', <<<'PHP'
<?php

declare(strict_types=1);

return [
    'data_dir' => './wgw-content',
    'update_feed_url' => 'https://example.test/releases/manifest.json',
    'pdo' => ['sqlite_file' => './wgw-content/test.sqlite'],
];
PHP);

        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();

        $config = $this->app->make(WgwDatabaseConfig::class)->connectionConfig();

        putenv('WGW_APP_ROOT');
        unset($_ENV['WGW_APP_ROOT']);
        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();
        if (is_dir($installRoot)) {
            $this->removeTree($installRoot);
        }

        $this->assertSame('sqlite', $config['driver']);
        $this->assertArrayHasKey('database', $config);
    }

    private function removeTree(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            if (is_dir($path)) {
                $this->removeTree($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
