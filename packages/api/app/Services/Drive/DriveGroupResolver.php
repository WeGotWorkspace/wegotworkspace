<?php

declare(strict_types=1);

namespace App\Services\Drive;

use Illuminate\Support\Facades\DB;

final class DriveGroupResolver
{
    /**
     * @return list<string>
     */
    public function allowedGroupSlugs(string $username): array
    {
        $rows = DB::connection('wgw')
            ->table('principals as g')
            ->join('groupmembers as gm', 'gm.principal_id', '=', 'g.id')
            ->join('principals as m', 'm.id', '=', 'gm.member_id')
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
