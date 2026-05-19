<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Admin\GroupManager;

/**
 * ACL rules for on-disk group folders: owner is the group principal; members
 * from {@see GroupManager::getMembers} get full access. No user authenticates
 * as the group URI, so member ACEs are required.
 */
final class GroupSharedAclHelper
{
    /**
     * @return list<array{privilege: string, principal: string, protected?: bool}>
     */
    public static function aclForGroup(\PDO $pdo, string $groupPrincipalUri): array
    {
        $aces = [
            [
                'privilege' => '{DAV:}all',
                'principal' => '{DAV:}owner',
                'protected' => true,
            ],
        ];
        try {
            $members = GroupManager::getMembers($pdo, $groupPrincipalUri);
        } catch (\Throwable) {
            $members = [];
        }
        foreach ($members as $memberUri) {
            if ($memberUri === '') {
                continue;
            }
            $aces[] = [
                'privilege' => '{DAV:}all',
                'principal' => $memberUri,
                'protected' => true,
            ];
        }

        return $aces;
    }
}
