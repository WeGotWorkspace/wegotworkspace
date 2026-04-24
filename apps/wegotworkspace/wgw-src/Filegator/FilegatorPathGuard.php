<?php

declare(strict_types=1);

namespace App\Filegator;

use App\Config;
use Filegator\Services\Auth\User;

/**
 * Keeps FileGator cwd aligned with WebDAV rules (no other accounts under {@code /users/}, no non-member groups).
 */
final class FilegatorPathGuard
{
    /**
     * @return list<string>
     */
    public static function allowedGroupSlugs(\PDO $pdo, string $username): array
    {
        $memberUri = 'principals/'.$username;
        $sql = 'SELECT g.uri FROM principals g
            INNER JOIN groupmembers gm ON gm.principal_id = g.id
            INNER JOIN principals m ON m.id = gm.member_id AND m.uri = ?
            WHERE g.uri LIKE ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$memberUri, 'principals/groups/%']);
        $slugs = [];
        while (($row = $stmt->fetchColumn()) !== false) {
            $uri = (string) $row;
            if (preg_match('#^principals/groups/(.+)$#', $uri, $m)) {
                $slugs[] = $m[1];
            }
        }

        return $slugs;
    }

    public static function sanitize(string $separator, string $path, ?User $user): string
    {
        if ($user === null || $user->getRole() === 'guest' || $user->getUsername() === 'guest') {
            return $path;
        }
        if (str_contains($path, '..')) {
            return $separator;
        }
        $username = strtolower(trim($user->getUsername()));
        if ($username === '') {
            return $path;
        }
        $sep = $separator === '' ? '/' : $separator;
        $n = str_replace('\\', '/', $path);
        if ($n === '' || $n === $sep) {
            return $sep;
        }
        $trim = trim($n, $sep);
        if ($trim === '') {
            return $sep;
        }
        $parts = explode('/', $trim);
        $pdo = self::pdo();
        if (($parts[0] ?? '') === 'users') {
            if (isset($parts[1]) && strcasecmp($parts[1], $username) !== 0) {
                return $sep.'users'.$sep;
            }
        } elseif (($parts[0] ?? '') === 'groups') {
            if (isset($parts[1])) {
                $slug = $parts[1];
                $allowed = self::allowedGroupSlugs($pdo, $username);
                if (!in_array($slug, $allowed, true)) {
                    return $sep.'groups'.$sep;
                }
            }
        }

        return $path;
    }

    private static function pdo(): \PDO
    {
        $c = Config::pdoCredentials(Config::load());

        return new \PDO($c['dsn'], $c['user'] ?? null, $c['password'] ?? null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
    }
}
