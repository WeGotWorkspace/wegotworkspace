<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;

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
        $this->setAppSetting('auth_realm', 'SabreDAV');
        $this->seedRoleMatrixUsers();
    }

    protected function seedRoleMatrixUsers(): void
    {
        if (User::query()->where('username', 'bob')->exists()) {
            return;
        }

        $this->seedWgwUser('bob', displayName: 'Bob');
        $this->seedWgwUser('alice', displayName: 'Alice');
        $alice = Principal::forUsername('alice');
        $this->assertNotNull($alice);
        $group = $this->seedWgwGroup(AdminRoleResolver::ADMIN_GROUP_URI, 'Administrators');
        $this->addPrincipalToGroup($group, $alice);
    }

    protected function userBearerToken(): string
    {
        return $this->issueBearerTokenFor('bob');
    }

    protected function adminBearerToken(): string
    {
        return $this->issueBearerTokenFor('alice');
    }
}
