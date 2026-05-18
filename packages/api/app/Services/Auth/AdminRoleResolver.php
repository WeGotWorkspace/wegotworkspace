<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Illuminate\Support\Facades\DB;

final class AdminRoleResolver
{
    public const ADMIN_GROUP_URI = 'principals/groups/administrators';

    public function isAdmin(string $username): bool
    {
        return DB::connection('wgw')
            ->table('groupmembers as gm')
            ->join('principals as g', 'g.id', '=', 'gm.principal_id')
            ->join('principals as m', 'm.id', '=', 'gm.member_id')
            ->where('g.uri', self::ADMIN_GROUP_URI)
            ->where('m.uri', 'principals/'.$username)
            ->exists();
    }
}
