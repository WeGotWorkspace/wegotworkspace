<?php

declare(strict_types=1);

namespace App\Drive;

final class DriveAcl
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

    public static function normalizeVirtualPath(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '') {
            return '/';
        }
        if ($path[0] !== '/') {
            $path = '/'.$path;
        }
        $parts = [];
        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                return '/';
            }
            $parts[] = $part;
        }

        return $parts === [] ? '/' : '/'.implode('/', $parts);
    }

    public static function isPathAllowed(string $path, string $username, array $groupSlugs, bool $forWrite): bool
    {
        $normalized = self::normalizeVirtualPath($path);
        if ($normalized === '/') {
            return true;
        }

        $segments = explode('/', ltrim($normalized, '/'));
        $first = $segments[0] ?? '';
        if ($first === 'users') {
            if (count($segments) === 1) {
                return !$forWrite;
            }

            return strcasecmp((string) ($segments[1] ?? ''), $username) === 0;
        }

        if ($first === 'groups') {
            if (count($segments) === 1) {
                return !$forWrite;
            }
            $slug = (string) ($segments[1] ?? '');

            return in_array($slug, $groupSlugs, true);
        }

        return false;
    }

    /**
     * @return list<string>
     */
    public static function listRootDirectories(string $username, array $groupSlugs): array
    {
        $dirs = [];
        $dirs[] = '/users';
        $dirs[] = '/groups';

        return $dirs;
    }
}
