<?php

declare(strict_types=1);

namespace App\Services\Auth;

final class RoleAuthorizer
{
    public static function allows(string $actual, string $required): bool
    {
        $rank = ['guest' => 1, 'user' => 2, 'admin' => 3];

        return ($rank[$actual] ?? 0) >= ($rank[$required] ?? 0);
    }
}
