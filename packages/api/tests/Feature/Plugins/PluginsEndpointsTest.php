<?php

declare(strict_types=1);

namespace Tests\Feature\Plugins;

use App\Models\Principal;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class PluginsEndpointsTest extends TestCase
{
    private string $dataDir = '';

    private string $previousAppRoot = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->previousAppRoot = getenv('WGW_APP_ROOT') ?: '';
        $this->dataDir = storage_path('framework/testing/wgw-plugins-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/install-root/wgw-plugins/onlyoffice/assets');
        putenv('WGW_APP_ROOT='.$this->dataDir.'/install-root');
        $_ENV['WGW_APP_ROOT'] = $this->dataDir.'/install-root';
        File::put($this->dataDir.'/install-root/wgw-plugins/onlyoffice/assets/index.html', '<!doctype html><title>Plugin</title>');
        File::put($this->dataDir.'/install-root/wgw-plugins/onlyoffice/plugin.json', json_encode([
            'id' => 'onlyoffice',
            'name' => 'ONLYOFFICE',
            'active' => true,
            'drive' => [
                'openFileExtensions' => ['docx'],
            ],
        ], JSON_THROW_ON_ERROR));

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('wgw');

        $keys = AuthTestKeys::rsaPair();
        config([
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ]);

        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applyAuthTables();
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
                ]],
            ]);
    }

    public function test_plugins_can_be_activated_and_deactivated(): void
    {
        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        $headers = ['Authorization' => 'Bearer '.$token];

        $this->postJson('/api/v1/plugins/onlyoffice/deactivate', [], $headers)
            ->assertOk()
            ->assertJsonPath('plugin.id', 'onlyoffice')
            ->assertJsonPath('plugin.active', false);

        $this->getJson('/api/v1/plugins', $headers)
            ->assertOk()
            ->assertJsonFragment([
                'id' => 'onlyoffice',
                'active' => false,
            ]);

        $this->postJson('/api/v1/plugins/onlyoffice/activate', [], $headers)
            ->assertOk()
            ->assertJsonPath('plugin.id', 'onlyoffice')
            ->assertJsonPath('plugin.active', true);

        $this->postJson('/api/v1/plugins/unknown/deactivate', [], $headers)
            ->assertNotFound()
            ->assertJsonPath('error', 'plugin_not_found');
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
