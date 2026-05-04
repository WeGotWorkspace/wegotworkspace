<?php

declare(strict_types=1);

namespace App\Admin;

use App\Installer\Seeder;
use Sabre\DAVACL\PrincipalBackend\PDO as PrincipalBackend;

final class GroupManager
{
    /**
     * @return list<array{uri: string, title: string}>
     */
    public static function listCollections(\PDO $pdo, string $prefix): array
    {
        $stmt = $pdo->prepare('SELECT uri, displayname FROM principals WHERE uri LIKE ? ORDER BY uri');
        $stmt->execute([$prefix.'%']);
        $out = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $uri = (string) $row['uri'];
            $title = (string) ($row['displayname'] ?? '');
            if ($title === '') {
                $title = basename(str_replace('\\', '/', $uri));
            }
            $out[] = ['uri' => $uri, 'title' => $title];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public static function listMemberPrincipalUris(\PDO $pdo): array
    {
        $sql = "SELECT uri FROM principals WHERE uri LIKE 'principals/%'
            AND uri NOT LIKE '%/calendar-proxy%'
            AND uri != ?
            AND uri NOT LIKE 'principals/groups/%'
            AND uri NOT LIKE 'principals/roles/%'
            ORDER BY uri";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([AdminConstants::GROUP_CONTAINER_URI]);
        $uris = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $uris[] = (string) $row['uri'];
        }

        return $uris;
    }

    /**
     * @param list<string> $memberUris
     */
    public static function setMembers(\PDO $pdo, string $groupUri, array $memberUris): void
    {
        $backend = new PrincipalBackend($pdo);
        $backend->setGroupMemberSet($groupUri, $memberUris);
    }

    /**
     * @return list<string>
     */
    public static function getMembers(\PDO $pdo, string $groupUri): array
    {
        $backend = new PrincipalBackend($pdo);

        return $backend->getGroupMemberSet($groupUri);
    }

    public static function createPrincipal(\PDO $pdo, string $uri, ?string $displayName): void
    {
        if (!str_starts_with($uri, AdminConstants::GROUP_PREFIX)) {
            throw new \InvalidArgumentException('Invalid principal path.');
        }
        Seeder::ensureGroupsContainerPrincipal($pdo);
        $stmt = $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, NULL, ?)');
        try {
            $stmt->execute([$uri, $displayName !== null && $displayName !== '' ? $displayName : null]);
        } catch (\PDOException $e) {
            throw new \InvalidArgumentException('That name already exists or is invalid.', 0, $e);
        }
    }

    public static function deleteCollection(\PDO $pdo, string $uri): void
    {
        if ($uri === AdminConstants::ADMIN_GROUP_URI) {
            throw new \InvalidArgumentException('The system administrators group cannot be deleted.');
        }
        if (!str_starts_with($uri, AdminConstants::GROUP_PREFIX)) {
            throw new \InvalidArgumentException('Invalid principal path.');
        }
        $stmt = $pdo->prepare('SELECT id FROM principals WHERE uri = ?');
        $stmt->execute([$uri]);
        $id = $stmt->fetchColumn();
        if ($id === false) {
            throw new \InvalidArgumentException('Not found.');
        }
        $id = (int) $id;
        $pdo->prepare('DELETE FROM groupmembers WHERE principal_id = ? OR member_id = ?')->execute([$id, $id]);
        $pdo->prepare('DELETE FROM principals WHERE uri = ?')->execute([$uri]);
    }
}
