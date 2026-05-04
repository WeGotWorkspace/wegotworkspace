<?php

declare(strict_types=1);

namespace App\Admin;

final class AdminPolicy
{
    public static function isAdmin(\PDO $pdo, string $username): bool
    {
        $memberUri = 'principals/'.$username;
        $sql = 'SELECT 1 FROM groupmembers gm
            INNER JOIN principals g ON g.id = gm.principal_id AND g.uri = ?
            INNER JOIN principals m ON m.id = gm.member_id AND m.uri = ?
            LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([AdminConstants::ADMIN_GROUP_URI, $memberUri]);

        return (bool) $stmt->fetchColumn();
    }
}
