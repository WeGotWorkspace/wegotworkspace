<?php

declare(strict_types=1);

namespace App\Admin;

use App\Installer\Seeder;

/**
 * One-time / idempotent fixes so admin access uses only the SabreDAV administrators group.
 */
final class AdminAccessMigration
{
    public static function run(\PDO $pdo): void
    {
        Seeder::ensureGroupsContainerPrincipal($pdo);
        self::ensurePrincipalForEveryUser($pdo);
        self::migrateLegacyAdminUsernamesSetting($pdo);
        self::bootstrapAdministratorsGroupIfEmpty($pdo);
    }

    private static function ensurePrincipalForEveryUser(\PDO $pdo): void
    {
        $stmt = $pdo->query('SELECT username FROM users');
        if ($stmt === false) {
            return;
        }
        $ins = $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, ?, ?)');
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $username = strtolower(trim((string) ($row['username'] ?? '')));
            if ($username === '' || !preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $username)) {
                continue;
            }
            $uri = 'principals/'.$username;
            $q = $pdo->prepare('SELECT 1 FROM principals WHERE uri = ?');
            $q->execute([$uri]);
            if ($q->fetchColumn()) {
                continue;
            }
            $ins->execute([$uri, $username.'@localhost', $username]);
        }
    }

    private static function migrateLegacyAdminUsernamesSetting(\PDO $pdo): void
    {
        $stmt = $pdo->prepare("SELECT value FROM app_settings WHERE name = 'admin_usernames'");
        $stmt->execute();
        $raw = $stmt->fetchColumn();
        if ($raw === false) {
            return;
        }
        $list = json_decode((string) $raw, true);
        if (is_array($list)) {
            foreach ($list as $u) {
                $u = strtolower(trim((string) $u));
                if ($u !== '' && preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $u)) {
                    Seeder::joinAdminGroup($pdo, 'principals/'.$u);
                }
            }
        }
        $pdo->exec("DELETE FROM app_settings WHERE name = 'admin_usernames'");
    }

    private static function bootstrapAdministratorsGroupIfEmpty(\PDO $pdo): void
    {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM groupmembers gm
            INNER JOIN principals g ON g.id = gm.principal_id AND g.uri = ?'
        );
        $stmt->execute([AdminConstants::ADMIN_GROUP_URI]);
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }
        $first = $pdo->query('SELECT username FROM users ORDER BY id ASC LIMIT 1');
        if ($first === false) {
            return;
        }
        $username = $first->fetchColumn();
        if (!is_string($username) || $username === '') {
            return;
        }
        Seeder::joinAdminGroup($pdo, 'principals/'.$username);
    }
}
