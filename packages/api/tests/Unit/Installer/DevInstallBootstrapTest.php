<?php

declare(strict_types=1);

namespace Tests\Unit\Installer;

use App\LocalConfigFile;
use App\Services\Installer\DevInstallBootstrap;
use App\Support\AppPaths;
use App\Support\WgwDatabaseConfig;
use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\DB;
use Tests\Support\WgwInstallFixture;
use Tests\TestCase;

final class DevInstallBootstrapTest extends TestCase
{
    private string $installRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->installRoot = sys_get_temp_dir().'/wgw-dev-install-test-'.uniqid('', true);
        mkdir($this->installRoot, 0775, true);
        file_put_contents($this->installRoot.'/index.php', "<?php\n");

        putenv('WGW_APP_ROOT='.$this->installRoot);
        $_ENV['WGW_APP_ROOT'] = $this->installRoot;

        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();
    }

    protected function tearDown(): void
    {
        putenv('WGW_APP_ROOT');
        unset($_ENV['WGW_APP_ROOT']);
        WgwInstallFixture::forgetInstallBindings();
        LocalConfigFile::clearCache();

        if (is_dir($this->installRoot)) {
            $this->removeTree($this->installRoot);
        }

        parent::tearDown();
    }

    public function test_ensure_creates_sqlite_install_and_is_idempotent(): void
    {
        $bootstrap = app(DevInstallBootstrap::class);

        $this->assertTrue($bootstrap->ensure('admin', 'storybook-dev'));
        $this->assertFileExists($this->installRoot.'/wgw-config.php');
        $this->assertFileExists($this->installRoot.'/wgw-content/db.sqlite');
        $this->assertFileExists($this->installRoot.'/wgw-content/.installed');
        $this->assertFileExists($this->installRoot.'/wgw-content/keys/api-jwt-private.pem');

        WgwInstallFixture::syncDatabaseConnection();
        $this->assertSame(1, DB::connection('wgw')->table('users')->where('username', 'admin')->count());
        $this->assertSame('SabreDAV', DB::connection('wgw')->table('app_settings')->where('name', 'auth_realm')->value('value'));

        $this->assertTrue(app(AppPaths::class)->isInstalled());
        $this->assertFalse($bootstrap->ensure('admin', 'storybook-dev'));
    }

    public function test_ensure_writes_sqlite_path_into_config(): void
    {
        app(DevInstallBootstrap::class)->ensure('admin', 'storybook-dev');

        $config = require $this->installRoot.'/wgw-config.php';
        $credentials = (new WgwDatabaseConfig(app(WgwInstallConfig::class)))->pdoCredentials();

        $this->assertSame('./wgw-content/db.sqlite', $config['pdo']['sqlite_file'] ?? null);
        $this->assertStringEndsWith('/wgw-content/db.sqlite', $credentials['dsn']);
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
