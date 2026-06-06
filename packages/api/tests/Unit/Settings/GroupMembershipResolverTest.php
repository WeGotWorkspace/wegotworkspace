<?php

declare(strict_types=1);

namespace Tests\Unit\Settings;

use App\Dav\Server\GroupSharedAclHelper;
use App\Models\GroupMember;
use App\Models\Principal;
use App\Services\Settings\GroupMembershipResolver;
use Tests\Support\WgwDatabaseTestCase;

final class GroupMembershipResolverTest extends WgwDatabaseTestCase
{
    public function test_member_principal_uris_for_group(): void
    {
        $group = Principal::query()->create([
            'uri' => 'principals/groups/support',
            'displayname' => 'Support',
        ]);
        $alice = Principal::query()->create([
            'uri' => 'principals/alice',
            'displayname' => 'Alice',
        ]);
        $bob = Principal::query()->create([
            'uri' => 'principals/bob',
            'displayname' => 'Bob',
        ]);
        GroupMember::query()->create([
            'principal_id' => $group->id,
            'member_id' => $bob->id,
        ]);
        GroupMember::query()->create([
            'principal_id' => $group->id,
            'member_id' => $alice->id,
        ]);

        $resolver = new GroupMembershipResolver;
        $members = $resolver->memberPrincipalUris('principals/groups/support');

        $this->assertSame(['principals/alice', 'principals/bob'], $members);
    }

    public function test_group_shared_acl_includes_members(): void
    {
        $group = Principal::query()->create([
            'uri' => 'principals/groups/team',
            'displayname' => 'Team',
        ]);
        $alice = Principal::query()->create([
            'uri' => 'principals/alice',
            'displayname' => 'Alice',
        ]);
        GroupMember::query()->create([
            'principal_id' => $group->id,
            'member_id' => $alice->id,
        ]);

        $resolver = new GroupMembershipResolver;
        $acl = GroupSharedAclHelper::aclForGroup('principals/groups/team', $resolver);

        $this->assertSame('{DAV:}owner', $acl[0]['principal']);
        $this->assertSame('principals/alice', $acl[1]['principal']);
        $this->assertSame('{DAV:}all', $acl[1]['privilege']);
    }
}
