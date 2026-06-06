<?php

declare(strict_types=1);

namespace Tests\Feature\Plugins;

use App\Models\Principal;
use App\Models\User;
use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;

final class PluginSessionEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    private string $previousAppRoot = '';

    protected function setUp(): void
    {
        $this->previousAppRoot = getenv('WGW_APP_ROOT') ?: '';
        $this->dataDir = rtrim(sys_get_temp_dir(), '/').'/wgw-plugin-session-'.uniqid('', true);
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
            'integration' => [
                'sessionApiPath' => '/api/v1/plugins/demo-plugin/session',
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

    public function test_plugin_session_requires_auth_and_establishes_cookie(): void
    {
        $this->postJson('/api/v1/plugins/demo-plugin/session')->assertUnauthorized();

        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        $headers = ['Authorization' => 'Bearer '.$token];

        $this->postJson('/api/v1/plugins/unknown/session', [], $headers)
            ->assertNotFound()
            ->assertJsonPath('error', 'plugin_not_found');

        $this->postJson('/api/v1/plugins/demo-plugin/session', [], $headers)
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    private function seedAlice(): void
    {
        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
    }
}
