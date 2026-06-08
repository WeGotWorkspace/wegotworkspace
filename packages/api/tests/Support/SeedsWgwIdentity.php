<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\GroupMember;
use App\Models\Principal;
use App\Models\User;

trait SeedsWgwIdentity
{
    protected function seedWgwUser(
        string $username,
        string $password = 'secret',
        ?string $email = null,
        ?string $displayName = null,
    ): User {
        $user = User::factory()->named($username)->withPassword($password)->create();
        Principal::factory()->forUsername($username, $displayName, $email)->create();

        return $user;
    }

    protected function seedWgwGroup(string $uri, string $displayName): Principal
    {
        return Principal::factory()->create([
            'uri' => $uri,
            'displayname' => $displayName,
            'email' => null,
        ]);
    }

    protected function addPrincipalToGroup(Principal $group, Principal $member): GroupMember
    {
        return GroupMember::factory()->forGroupAndMember($group, $member)->create();
    }
}
