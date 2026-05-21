<?php

declare(strict_types=1);

namespace Tests\Feature\Installer;

use Tests\TestCase;

final class InstallerEndpointsTest extends TestCase
{
    private string $installRoot;

    protected function setUp(): void
    {
        $this->installRoot = sys_get_temp_dir().'/wgw-installer-test-'.uniqid('', true);
        mkdir($this->installRoot, 0775, true);
        mkdir($this->installRoot.'/wgw-content', 0775, true);
        file_put_contents($this->installRoot.'/index.php', "<?php\n");

        putenv('WGW_APP_ROOT='.$this->installRoot);
        $_ENV['WGW_APP_ROOT'] = $this->installRoot;
        putenv('WGW_DISABLE_INSTALL_THROTTLE=1');
        $_ENV['WGW_DISABLE_INSTALL_THROTTLE'] = '1';

        parent::setUp();

        config(['wgw.data_dir' => $this->installRoot.'/wgw-content']);
    }

    protected function tearDown(): void
    {
        $lock = $this->installRoot.'/wgw-content/.installed';
        if (is_file($lock)) {
            @unlink($lock);
        }
        if (is_file($this->installRoot.'/wgw-config.php')) {
            @unlink($this->installRoot.'/wgw-config.php');
        }

        \App\LocalConfigFile::clearCache();

        parent::tearDown();
    }

    public function test_state_and_bootstrap_expose_welcome_step(): void
    {
        $state = $this->getJson('/api/v1/installer/state');
        $state->assertOk()
            ->assertJsonPath('installed', false)
            ->assertJsonPath('maintenance', false)
            ->assertJsonPath('state.step', 'welcome')
            ->assertJsonStructure(['state' => ['checks']]);

        $bootstrap = $this->getJson('/api/v1/installer/bootstrap');
        $bootstrap->assertOk()
            ->assertJsonPath('state.step', 'welcome');
    }

    public function test_stale_lock_without_keys_allows_installer(): void
    {
        file_put_contents($this->installRoot.'/wgw-content/.installed', date('c')."\n");

        $this->getJson('/api/v1/installer/bootstrap')
            ->assertOk()
            ->assertJsonPath('state.step', 'welcome');

        $this->assertFileDoesNotExist($this->installRoot.'/wgw-content/.installed');
    }

    public function test_wizard_advances_through_sqlite_install(): void
    {
        $sqlitePath = './wgw-content/install-test.sqlite';

        $this->postJson('/api/v1/installer/action', [
            'action' => 'welcome_next',
            'payload' => [],
        ])->assertOk()->assertJsonPath('ok', true)
            ->assertJsonPath('state.step', 'requirements');

        $this->postJson('/api/v1/installer/action', [
            'action' => 'requirements_next',
            'payload' => ['db_driver' => 'sqlite'],
        ])->assertOk()->assertJsonPath('state.step', 'database');

        $this->postJson('/api/v1/installer/action', [
            'action' => 'database_next',
            'payload' => [
                'db_driver' => 'sqlite',
                'sqlite_path' => $sqlitePath,
            ],
        ])->assertOk()->assertJsonPath('state.step', 'site');

        $this->postJson('/api/v1/installer/action', [
            'action' => 'site_next',
            'payload' => [
                'timezone' => 'UTC',
                'enable_files' => true,
                'enable_calendars' => true,
                'enable_contacts' => false,
                'show_browser_ui' => true,
            ],
        ])->assertOk()->assertJsonPath('state.step', 'account');

        $install = $this->postJson('/api/v1/installer/action', [
            'action' => 'install',
            'payload' => [
                'username' => 'admin',
                'display_name' => 'Admin',
                'email' => 'admin@example.test',
                'password' => 'longpassword',
                'password_confirm' => 'longpassword',
                'mail_enabled' => false,
                'voice_enabled' => false,
            ],
        ]);

        $install->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonStructure(['redirect', 'state']);

        $this->assertFileExists($this->installRoot.'/wgw-content/.installed');
        $this->assertFileExists($this->installRoot.'/wgw-config.php');
        $this->assertFileExists($this->installRoot.'/wgw-content/install-test.sqlite');
        $this->assertFileExists($this->installRoot.'/wgw-content/keys/api-jwt-private.pem');
        $this->assertFileExists($this->installRoot.'/wgw-content/keys/api-jwt-public.pem');

        $db = new \PDO('sqlite:'.$this->installRoot.'/wgw-content/install-test.sqlite');
        $stmt = $db->query("SELECT value FROM app_settings WHERE name = 'auth_realm'");
        $this->assertSame('SabreDAV', $stmt->fetchColumn());
        $stmt = $db->query("SELECT value FROM app_settings WHERE name = 'base_uri'");
        $this->assertSame('/', $stmt->fetchColumn());

        $this->getJson('/api/v1/installer/state')
            ->assertOk()
            ->assertJsonPath('installed', true)
            ->assertJsonPath('state.step', 'installed');
    }
}
