<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Principal;
use App\Services\Auth\AdminRoleResolver;
use Tests\Support\WgwDatabaseTestCase;

final class AuthEndpointsTest extends WgwDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();
        config(['wgw.auth_realm' => 'SabreDAV']);
        $this->seedAliceUser();
    }

    public function test_jwks_returns_public_key(): void
    {
        $response = $this->getJson('/api/v1/.well-known/jwks.json');
        $response->assertOk();
        $response->assertJsonStructure(['keys' => [['kty', 'kid', 'n', 'e']]]);
    }

    public function test_token_refresh_me_and_revoke_flow(): void
    {
        $tokenResponse = $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ]);
        $tokenResponse->assertOk();
        $tokenResponse->assertJsonStructure([
            'access_token',
            'refresh_token',
            'token_type',
            'expires_in',
            'role',
            'username',
        ]);
        $this->assertSame('user', $tokenResponse->json('role'));
        $access = (string) $tokenResponse->json('access_token');
        $refresh = (string) $tokenResponse->json('refresh_token');

        $me = $this->withBearer($access)->getJson('/api/v1/me');
        $me->assertOk();
        $me->assertJson([
            'username' => 'alice',
            'role' => 'user',
        ]);

        $refreshed = $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $refresh,
        ]);
        $refreshed->assertOk();
        $newAccess = (string) $refreshed->json('access_token');
        $this->assertNotSame('', $newAccess);

        $revoke = $this->withBearer($newAccess)->postJson('/api/v1/auth/revoke', [
            'refresh_token' => (string) $refreshed->json('refresh_token'),
        ]);
        $revoke->assertOk();
        $revoke->assertJson(['ok' => true]);

        $this->withBearer($newAccess)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_invalid_credentials_return_401(): void
    {
        $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'wrong',
        ])
            ->assertUnauthorized()
            ->assertJson([
                'error' => 'Invalid credentials.',
                'code' => 'unauthorized',
            ]);
    }

    public function test_admin_role_when_in_administrators_group(): void
    {
        $group = $this->seedWgwGroup(AdminRoleResolver::ADMIN_GROUP_URI, 'Administrators');
        $alicePrincipal = Principal::forUsername('alice');
        $this->assertNotNull($alicePrincipal);
        $this->addPrincipalToGroup($group, $alicePrincipal);

        $response = $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ]);
        $response->assertOk();
        $this->assertSame('admin', $response->json('role'));
    }

    private function seedAliceUser(): void
    {
        $this->setAppSetting('auth_realm', 'SabreDAV');
        $this->seedWgwUser('alice', displayName: 'Alice');
    }
}
