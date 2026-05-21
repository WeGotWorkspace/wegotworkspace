<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use App\Dav\SabreServerFactory;
use App\Support\AppPaths;
use App\Support\WgwInstallConfig;
use Tests\Support\SqliteWgwSchema;
use Tests\Support\WgwInstallFixture;
use Tests\TestCase;

final class SabreKernelTest extends TestCase
{
    public function test_sabre_server_factory_builds_when_installed(): void
    {
        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        \Illuminate\Support\Facades\DB::purge('wgw');
        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applySabreTables();

        $installRoot = sys_get_temp_dir().'/wgw-sabre-root-'.uniqid('', true);
        mkdir($installRoot, 0775, true);
        file_put_contents($installRoot.'/index.php', "<?php\n");
        $data = $installRoot.'/wgw-content';
        mkdir($data.'/files/users', 0775, true);
        mkdir($data.'/files/groups', 0775, true);
        putenv('WGW_APP_ROOT='.$installRoot);
        $_ENV['WGW_APP_ROOT'] = $installRoot;
        WgwInstallFixture::markInstalled($installRoot, $data);

        config(['wgw.data_dir' => $data]);
        WgwInstallFixture::forgetInstallBindings();

        $factory = $this->app->make(SabreServerFactory::class);
        $server = $factory->create();
        $this->assertSame('/', $server->getBaseUri());

        $this->assertTrue($this->app->make(AppPaths::class)->isInstalled());
    }
}
