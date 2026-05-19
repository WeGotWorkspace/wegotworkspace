<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class DavEndpointsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

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
            'wgw.auth_realm' => 'SabreDAV',
        ]);

        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applyAuthTables();
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

    public function test_dav_capabilities_requires_auth_and_returns_flags(): void
    {
        $this->getJson('/api/v1/dav/capabilities')->assertUnauthorized();

        $token = $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        AppSetting::setValue('base_uri', '/dav/');
        AppSetting::setValue('calendar_enabled', false);

        $response = $this->getJson('/api/v1/dav/capabilities', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('baseUri', '/dav/')
            ->assertJsonPath('filesEnabled', true)
            ->assertJsonPath('calendarEnabled', false)
            ->assertJsonPath('contactsEnabled', true);
    }
}
