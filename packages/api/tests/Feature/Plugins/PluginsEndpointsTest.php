<?php

declare(strict_types=1);

namespace Tests\Feature\Plugins;

use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;

final class PluginsEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    private string $previousAppRoot = '';

    protected function setUp(): void
    {
        $this->previousAppRoot = getenv('WGW_APP_ROOT') ?: '';
        $this->dataDir = rtrim(sys_get_temp_dir(), '/').'/wgw-plugins-'.uniqid('', true);
        @mkdir($this->dataDir.'/install-root/wgw-plugins/demo-plugin/assets', 0777, true);
        putenv('WGW_APP_ROOT='.$this->dataDir.'/install-root');
        $_ENV['WGW_APP_ROOT'] = $this->dataDir.'/install-root';
        @file_put_contents($this->dataDir.'/install-root/wgw-plugins/demo-plugin/assets/index.html', '<!doctype html><title>Plugin</title>');
        @file_put_contents($this->dataDir.'/install-root/wgw-plugins/demo-plugin/assets/editor.html', '<!doctype html><title>Editor</title>');
        @file_put_contents($this->dataDir.'/install-root/wgw-plugins/demo-plugin/plugin.json', json_encode([
            'id' => 'demo-plugin',
            'name' => 'Demo plugin',
            'active' => true,
            'appTile' => [
                'id' => 'demo',
                'label' => 'Demo',
                'route' => '/apps/demo-editor',
            ],
            'drive' => [
                'openFileExtensions' => ['docx'],
            ],
        ], JSON_THROW_ON_ERROR));
        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        parent::setUp();
        $this->configureWgwJwtKeys();
        $this->seedAlice();
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }
        if ($this->previousAppRoot !== '') {
            putenv('WGW_APP_ROOT='.$this->previousAppRoot);
            $_ENV['WGW_APP_ROOT'] = $this->previousAppRoot;
        } else {
            putenv('WGW_APP_ROOT');
            unset($_ENV['WGW_APP_ROOT']);
        }

        parent::tearDown();
    }

    public function test_plugins_requires_auth_and_returns_drive_handlers(): void
    {
        $this->getJson('/api/v1/plugins')->assertUnauthorized();

        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        $response = $this->getJson('/api/v1/plugins', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'plugins' => [[
                    'id',
                    'name',
                    'active',
                    'source',
                    'runtime' => [
                        'indexReady',
                        'editorReady',
                    ],
                ]],
            ]);
    }

    public function test_plugins_runtime_readiness_flags(): void
    {
        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        $this->getJson('/api/v1/plugins', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('plugins.0.runtime.indexReady', true)
            ->assertJsonPath('plugins.0.runtime.editorReady', true);
    }

    public function test_plugins_can_be_activated_and_deactivated(): void
    {
        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        $headers = ['Authorization' => 'Bearer '.$token];

        $this->putJson('/api/v1/plugins/demo-plugin/activation', ['active' => false], $headers)
            ->assertOk()
            ->assertJsonPath('plugin.id', 'demo-plugin')
            ->assertJsonPath('plugin.active', false);

        $this->getJson('/api/v1/plugins', $headers)
            ->assertOk()
            ->assertJsonFragment([
                'id' => 'demo-plugin',
                'active' => false,
            ]);

        $this->putJson('/api/v1/plugins/demo-plugin/activation', ['active' => true], $headers)
            ->assertOk()
            ->assertJsonPath('plugin.id', 'demo-plugin')
            ->assertJsonPath('plugin.active', true);

        $this->putJson('/api/v1/plugins/unknown/activation', ['active' => false], $headers)
            ->assertNotFound()
            ->assertJsonPath('error', 'plugin_not_found');
    }

    private function seedAlice(): void
    {
        $this->seedWgwUser('alice', displayName: 'Alice');
    }
}
