<?php

declare(strict_types=1);

namespace Tests\Feature\Home;

use App\Models\AppSetting;
use Tests\Support\WgwDatabaseTestCase;

final class HomeEndpointsTest extends WgwDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();
        $this->seedAlice();
    }

    public function test_home_state_requires_auth_and_returns_availability(): void
    {
        $this->getJson('/api/v1/workspace/state')->assertUnauthorized();

        $token = $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        AppSetting::query()->create([
            'name' => 'files_enabled',
            'value' => json_encode(true, JSON_THROW_ON_ERROR),
        ]);

        $response = $this->getJson('/api/v1/workspace/state', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('username', 'alice')
            ->assertJsonPath('isAdmin', false)
            ->assertJsonStructure([
                'availability' => [
                    'filesEnabled',
                    'drive',
                    'mail',
                    'meet',
                    'notes',
                ],
            ]);
    }

    private function seedAlice(): void
    {
        $this->seedWgwUser('alice', displayName: 'Alice');
    }
}
