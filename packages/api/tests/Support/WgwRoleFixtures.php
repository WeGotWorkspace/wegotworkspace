<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Seeds bob (user) and alice (admin) and issues bearer tokens for role-matrix tests.
 */
trait WgwRoleFixtures
{
    protected function configureRoleMatrix(): void
    {
        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();
        config(['wgw.auth_realm' => 'SabreDAV']);
        AppSetting::setValue('auth_realm', 'SabreDAV');
        $this->seedRoleMatrixUsers();
    }

    protected function seedRoleMatrixUsers(): void
    {
        if (User::query()->where('username', 'bob')->exists()) {
            return;
        }

        User::query()->create([
            'username' => 'bob',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/bob',
            'email' => 'bob@example.test',
            'displayname' => 'Bob',
        ]);

        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        $alice = Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
        $group = Principal::query()->create([
            'uri' => AdminRoleResolver::ADMIN_GROUP_URI,
            'displayname' => 'Administrators',
        ]);
        DB::connection('wgw')->table('groupmembers')->insert([
            'principal_id' => $group->id,
            'member_id' => $alice->id,
        ]);
    }

    protected function userBearerToken(): string
    {
        return $this->issueBearerTokenFor('bob');
    }

    protected function adminBearerToken(): string
    {
        return $this->issueBearerTokenFor('alice');
    }

    protected function issueBearerTokenFor(string $username): string
    {
        /** @var TestCase $this */
        $response = $this->postJson('/api/v1/auth/token', [
            'username' => $username,
            'password' => 'secret',
        ]);
        $response->assertOk();

        return (string) $response->json('access_token');
    }

    /**
     * @return array<string, string>
     */
    protected function bearerHeaders(?string $token): array
    {
        if ($token === null || $token === '') {
            return [];
        }

        return ['Authorization' => 'Bearer '.$token];
    }
}
