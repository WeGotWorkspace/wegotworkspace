<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use Tests\Support\WgwDatabaseTestCase;

final class DavEndpointsTest extends WgwDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();
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
