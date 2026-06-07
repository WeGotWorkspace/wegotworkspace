<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\LocalConfigFile;
use App\Support\AppPaths;
use Tests\Support\WgwInstallFixture;
use Tests\TestCase;

final class AppPathsDatabaseReadyTest extends TestCase
{
    private string $installRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->installRoot = sys_get_temp_dir().'/wgw-app-paths-test-'.uniqid('', true);
        mkdir($this->installRoot, 0775, true);
        mkdir($this->installRoot.'/wgw-content/keys', 0700, true);

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

    public function test_mysql_define_style_config_does_not_require_sqlite_file(): void
    {
        $config = <<<'PHP'
<?php

declare(strict_types=1);

defined('WGW_DATA_DIR') || define('WGW_DATA_DIR', 'wgw-content');
defined('WGW_DB_DSN') || define('WGW_DB_DSN', 'mysql:host=127.0.0.1;port=3306;dbname=missing_wegotworkspace;charset=utf8mb4');
defined('WGW_DB_USER') || define('WGW_DB_USER', 'db_user');
defined('WGW_DB_PASSWORD') || define('WGW_DB_PASSWORD', 'db_password');
PHP;
        file_put_contents($this->installRoot.'/wgw-config.php', $config);
        file_put_contents($this->installRoot.'/wgw-content/.installed', date('c')."\n");
        file_put_contents($this->installRoot.'/wgw-content/keys/api-jwt-private.pem', str_repeat('a', 64));
        file_put_contents($this->installRoot.'/wgw-content/keys/api-jwt-public.pem', str_repeat('b', 64));

        $paths = app(AppPaths::class);

        $this->assertFileDoesNotExist($this->installRoot.'/wgw-content/db.sqlite');
        $this->assertFalse($paths->databaseReady());
        $this->assertFalse($paths->isInstalled());
    }

    public function test_sqlite_install_is_detected_when_users_exist(): void
    {
        WgwInstallFixture::markInstalled($this->installRoot, $this->installRoot.'/wgw-content');

        $paths = app(AppPaths::class);

        $this->assertTrue($paths->databaseReady());
        $this->assertTrue($paths->isInstalled());
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
