<?php

declare(strict_types=1);

namespace Tests\Unit\Installer;

use App\LocalConfigFile;
use App\Services\Installer\ProductionInstallBootstrap;
use App\Services\Installer\WgwInstallEnv;
use App\Support\AppPaths;
use Tests\Support\WgwInstallFixture;
use Tests\TestCase;

final class WgwInstallEnvTest extends TestCase
{
    private string $installRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->installRoot = sys_get_temp_dir().'/wgw-install-env-test-'.uniqid('', true);
        mkdir($this->installRoot, 0775, true);
        mkdir($this->installRoot.'/wgw-content', 0775, true);
        file_put_contents($this->installRoot.'/index.php', "<?php\n");

        putenv('WGW_APP_ROOT='.$this->installRoot);
        $_ENV['WGW_APP_ROOT'] = $this->installRoot;
        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();
    }

    protected function tearDown(): void
    {
        $this->clearInstallEnv();
        putenv('WGW_APP_ROOT');
        unset($_ENV['WGW_APP_ROOT']);
        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();

        if (is_dir($this->installRoot)) {
            $this->removeTree($this->installRoot);
        }

        parent::tearDown();
    }

    public function test_wizard_defaults_merge_mysql_and_site_fields(): void
    {
        putenv('WGW_INSTALL_DB_DRIVER=mysql');
        $_ENV['WGW_INSTALL_DB_DRIVER'] = 'mysql';
        putenv('WGW_INSTALL_DB_HOST=db');
        $_ENV['WGW_INSTALL_DB_HOST'] = 'db';
        putenv('WGW_INSTALL_DB_PORT=3306');
        $_ENV['WGW_INSTALL_DB_PORT'] = '3306';
        putenv('WGW_INSTALL_DB_DATABASE=wgw');
        $_ENV['WGW_INSTALL_DB_DATABASE'] = 'wgw';
        putenv('WGW_INSTALL_DB_USER=wgw');
        $_ENV['WGW_INSTALL_DB_USER'] = 'wgw';
        putenv('WGW_INSTALL_DB_PASSWORD=secret');
        $_ENV['WGW_INSTALL_DB_PASSWORD'] = 'secret';
        putenv('WGW_INSTALL_TIMEZONE=Europe/Amsterdam');
        $_ENV['WGW_INSTALL_TIMEZONE'] = 'Europe/Amsterdam';
        putenv('WGW_INSTALL_BASE_URI=/wgw/');
        $_ENV['WGW_INSTALL_BASE_URI'] = '/wgw/';
        putenv('WGW_INSTALL_ADMIN_USERNAME=Admin');
        $_ENV['WGW_INSTALL_ADMIN_USERNAME'] = 'Admin';
        putenv('WGW_INSTALL_ADMIN_EMAIL=admin@example.test');
        $_ENV['WGW_INSTALL_ADMIN_EMAIL'] = 'admin@example.test';

        $defaults = app(WgwInstallEnv::class)->wizardDefaults('');

        $this->assertSame('mysql', $defaults['db_driver']);
        $this->assertSame('db', $defaults['db']['mysql_host'] ?? null);
        $this->assertSame('wgw', $defaults['db']['mysql_db'] ?? null);
        $this->assertSame('Europe/Amsterdam', $defaults['timezone']);
        $this->assertSame('/wgw/', $defaults['base_uri']);
        $this->assertSame('admin', $defaults['admin_username'] ?? null);
        $this->assertSame('admin@example.test', $defaults['admin_email'] ?? null);
        $this->assertArrayNotHasKey('admin_password', $defaults);
    }

    public function test_headless_plan_requires_complete_env(): void
    {
        putenv('WGW_INSTALL_HEADLESS=1');
        $_ENV['WGW_INSTALL_HEADLESS'] = '1';
        putenv('WGW_INSTALL_DB_DRIVER=sqlite');
        $_ENV['WGW_INSTALL_DB_DRIVER'] = 'sqlite';
        putenv('WGW_INSTALL_BASE_URI=/');
        $_ENV['WGW_INSTALL_BASE_URI'] = '/';

        $this->assertNull(app(WgwInstallEnv::class)->headlessPlan(''));

        putenv('WGW_INSTALL_ADMIN_USERNAME=admin');
        $_ENV['WGW_INSTALL_ADMIN_USERNAME'] = 'admin';
        putenv('WGW_INSTALL_ADMIN_EMAIL=admin@example.test');
        $_ENV['WGW_INSTALL_ADMIN_EMAIL'] = 'admin@example.test';
        putenv('WGW_INSTALL_ADMIN_PASSWORD=longpassword');
        $_ENV['WGW_INSTALL_ADMIN_PASSWORD'] = 'longpassword';

        $plan = app(WgwInstallEnv::class)->headlessPlan('');
        $this->assertIsArray($plan);
        $this->assertSame('sqlite', $plan['state']['db_driver'] ?? null);
        $this->assertSame('admin', $plan['payload']['username'] ?? null);
    }

    public function test_bootstrap_endpoint_prefills_mysql_from_env(): void
    {
        putenv('WGW_INSTALL_DB_DRIVER=mysql');
        $_ENV['WGW_INSTALL_DB_DRIVER'] = 'mysql';
        putenv('WGW_INSTALL_DB_HOST=db');
        $_ENV['WGW_INSTALL_DB_HOST'] = 'db';
        putenv('WGW_INSTALL_DB_DATABASE=wgw');
        $_ENV['WGW_INSTALL_DB_DATABASE'] = 'wgw';
        putenv('WGW_INSTALL_DB_USER=wgw');
        $_ENV['WGW_INSTALL_DB_USER'] = 'wgw';
        putenv('WGW_INSTALL_DB_PASSWORD=secret');
        $_ENV['WGW_INSTALL_DB_PASSWORD'] = 'secret';
        putenv('WGW_INSTALL_TIMEZONE=UTC');
        $_ENV['WGW_INSTALL_TIMEZONE'] = 'UTC';

        config(['wgw.data_dir' => $this->installRoot.'/wgw-content']);

        $this->getJson('/api/v1/installer/bootstrap')
            ->assertOk()
            ->assertJsonPath('state.db_driver', 'mysql')
            ->assertJsonPath('state.db.mysql_host', 'db')
            ->assertJsonPath('state.db.mysql_db', 'wgw')
            ->assertJsonPath('state.db.mysql_user', 'wgw');
    }

    public function test_wgw_install_command_runs_headless_sqlite_install(): void
    {
        putenv('WGW_DISABLE_INSTALL_THROTTLE=1');
        $_ENV['WGW_DISABLE_INSTALL_THROTTLE'] = '1';
        putenv('WGW_INSTALL_HEADLESS=1');
        $_ENV['WGW_INSTALL_HEADLESS'] = '1';
        putenv('WGW_INSTALL_DB_DRIVER=sqlite');
        $_ENV['WGW_INSTALL_DB_DRIVER'] = 'sqlite';
        putenv('WGW_INSTALL_BASE_URI=/');
        $_ENV['WGW_INSTALL_BASE_URI'] = '/';
        putenv('WGW_INSTALL_ADMIN_USERNAME=admin');
        $_ENV['WGW_INSTALL_ADMIN_USERNAME'] = 'admin';
        putenv('WGW_INSTALL_ADMIN_EMAIL=admin@example.test');
        $_ENV['WGW_INSTALL_ADMIN_EMAIL'] = 'admin@example.test';
        putenv('WGW_INSTALL_ADMIN_PASSWORD=longpassword');
        $_ENV['WGW_INSTALL_ADMIN_PASSWORD'] = 'longpassword';

        config(['wgw.data_dir' => $this->installRoot.'/wgw-content']);

        $bootstrap = app(ProductionInstallBootstrap::class);
        $this->assertSame('installed', $bootstrap->run(''));

        $this->assertFileExists($this->installRoot.'/wgw-content/.installed');
        $this->assertFileExists($this->installRoot.'/wgw-config.php');
        $this->assertTrue(app(AppPaths::class)->isInstalled());
        $this->assertSame('skipped', $bootstrap->run(''));
    }

    private function clearInstallEnv(): void
    {
        foreach ([
            'WGW_INSTALL_HEADLESS',
            'WGW_INSTALL_DB_DRIVER',
            'WGW_INSTALL_DB_HOST',
            'WGW_INSTALL_DB_PORT',
            'WGW_INSTALL_DB_DATABASE',
            'WGW_INSTALL_DB_USER',
            'WGW_INSTALL_DB_PASSWORD',
            'WGW_INSTALL_DB_SQLITE_PATH',
            'WGW_INSTALL_BASE_URI',
            'WGW_INSTALL_BASE_URI_AUTO',
            'WGW_INSTALL_TIMEZONE',
            'WGW_INSTALL_ADMIN_USERNAME',
            'WGW_INSTALL_ADMIN_EMAIL',
            'WGW_INSTALL_ADMIN_PASSWORD',
            'WGW_INSTALL_ADMIN_DISPLAY_NAME',
            'WGW_DISABLE_INSTALL_THROTTLE',
        ] as $key) {
            putenv($key);
            unset($_ENV[$key]);
        }
    }

    private function removeTree(string $dir): void
    {
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
