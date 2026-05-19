<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class AuthEndpointsTest extends TestCase
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

        $me = $this->getJson('/api/v1/me', [
            'Authorization' => 'Bearer '.$access,
        ]);
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

        $revoke = $this->postJson('/api/v1/auth/revoke', [
            'refresh_token' => (string) $refreshed->json('refresh_token'),
        ], [
            'Authorization' => 'Bearer '.$newAccess,
        ]);
        $revoke->assertOk();
        $revoke->assertJson(['ok' => true]);

        $this->getJson('/api/v1/me', [
            'Authorization' => 'Bearer '.$newAccess,
        ])->assertUnauthorized();
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
        $group = Principal::query()->create([
            'uri' => AdminRoleResolver::ADMIN_GROUP_URI,
            'displayname' => 'Administrators',
        ]);
        $alicePrincipal = Principal::query()->where('uri', 'principals/alice')->first();
        $this->assertNotNull($alicePrincipal);
        DB::connection('wgw')->table('groupmembers')->insert([
            'principal_id' => $group->id,
            'member_id' => $alicePrincipal->id,
        ]);

        $response = $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ]);
        $response->assertOk();
        $this->assertSame('admin', $response->json('role'));
    }

    private function seedAliceUser(): void
    {
        AppSetting::setValue('auth_realm', 'SabreDAV');
        User::query()->create([
            'username' => 'alice',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
    }
}
