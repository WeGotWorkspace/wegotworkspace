<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Models\GroupMember;

final class DriveGroupResolver
{
    /**
     * @return list<string>
     */
    public function allowedGroupSlugs(string $username): array
    {
        $rows = GroupMember::query()
            ->join('principals as g', 'g.id', '=', 'groupmembers.principal_id')
            ->join('principals as m', 'm.id', '=', 'groupmembers.member_id')
            ->where('m.uri', 'principals/'.$username)
            ->where('g.uri', 'like', 'principals/groups/%')
            ->pluck('g.uri');

        $slugs = [];
        foreach ($rows as $uri) {
            if (preg_match('#^principals/groups/(.+)$#', (string) $uri, $matches)) {
                $slugs[] = $matches[1];
            }
        }

        return $slugs;
    }
}
