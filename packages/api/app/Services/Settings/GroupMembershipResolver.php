<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Models\GroupMember;

final class GroupMembershipResolver
{
    /**
     * @return list<string>
     */
    public function memberPrincipalUris(string $groupUri): array
    {
        return GroupMember::query()
            ->join('principals as g', 'g.id', '=', 'groupmembers.principal_id')
            ->join('principals as m', 'm.id', '=', 'groupmembers.member_id')
            ->where('g.uri', $groupUri)
            ->orderBy('m.uri')
            ->pluck('m.uri')
            ->map(static fn ($uri): string => (string) $uri)
            ->all();
    }
}
