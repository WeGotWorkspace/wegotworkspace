<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use App\Models\User;
use App\Support\AppPaths;
use App\Support\WgwInstallConfig;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class SabreBrowserAssetTest extends TestCase
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
        \Illuminate\Support\Facades\DB::purge('wgw');
        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applySabreTables();

        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);

        $data = sys_get_temp_dir().'/wgw-browser-asset-'.uniqid('', true);
        mkdir($data, 0775, true);
        mkdir($data.'/files/users', 0775, true);
        mkdir($data.'/files/groups', 0775, true);
        file_put_contents($data.'/.installed', date('c')."\n");

        config(['wgw.data_dir' => $data]);
        $this->app->forgetInstance(WgwInstallConfig::class);
        $this->app->forgetInstance(AppPaths::class);
    }

    public function test_sabre_browser_css_is_not_served_by_ui_shell(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');

        $response = $this->call(
            'GET',
            '/?sabreAction=asset&assetName=sabredav.css',
            [],
            [],
            [],
            ['HTTP_AUTHORIZATION' => $auth],
        );

        $response->assertOk();
        $this->assertStringStartsWith('text/css', (string) $response->headers->get('Content-Type'));
        $this->assertStringContainsString('box-sizing', $response->streamedContent());
    }
}
