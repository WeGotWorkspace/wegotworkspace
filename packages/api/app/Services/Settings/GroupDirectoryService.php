<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Admin\AdminConstants;
use App\Models\Principal;
use Illuminate\Support\Facades\DB;
use Sabre\DAVACL\PrincipalBackend\PDO as PrincipalBackend;

final class GroupDirectoryService
{
    /**
     * @return list<array{id: string, name: string, displayName: string}>
     */
    public function listGroupSummaries(): array
    {
        $out = [];
        foreach ($this->listGroupCollections() as $group) {
            $uri = (string) $group['uri'];
            $out[] = [
                'id' => $uri,
                'name' => basename(str_replace('\\', '/', $uri)),
                'displayName' => (string) $group['title'],
            ];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public function memberPrincipalUris(string $groupUri): array
    {
        return $this->memberUris($groupUri);
    }

    /**
     * @param  list<string>  $memberUsernames  Principal URIs or bare usernames
     */
    public function replaceMembers(string $groupUri, array $memberUsernames, string $actingAdmin): void
    {
        if ($groupUri === AdminConstants::ADMIN_GROUP_URI) {
            $actingPrincipal = 'principals/'.$actingAdmin;
            $hasActing = false;
            foreach ($memberUsernames as $entry) {
                $uri = $this->toMemberPrincipalUri((string) $entry);
                if ($uri === $actingPrincipal) {
                    $hasActing = true;
                    break;
                }
            }
            if (! $hasActing) {
                throw new \InvalidArgumentException('You cannot remove your own administrator access.');
            }
        }

        $uris = [];
        foreach ($memberUsernames as $entry) {
            $uri = $this->toMemberPrincipalUri((string) $entry);
            if ($uri !== '') {
                $uris[$uri] = true;
            }
        }

        $this->writeMembers($groupUri, array_keys($uris));
    }

    public function setMembership(string $groupUri, string $username, bool $enabled, string $actingAdmin): void
    {
        if ($groupUri === AdminConstants::ADMIN_GROUP_URI && $username === $actingAdmin && ! $enabled) {
            throw new \InvalidArgumentException('You cannot remove your own administrator access.');
        }

        $principal = 'principals/'.$username;
        $members = $this->memberUris($groupUri);
        $isMember = in_array($principal, $members, true);

        if ($enabled && ! $isMember) {
            $members[] = $principal;
            $this->writeMembers($groupUri, $members);

            return;
        }

        if (! $enabled && $isMember) {
            $members = array_values(array_filter($members, static fn (string $m): bool => $m !== $principal));
            $this->writeMembers($groupUri, $members);
        }
    }

    /**
     * @return list<array{id: string, displayName: string}>
     */
    public function groupsForUser(string $username): array
    {
        $principalUri = 'principals/'.$username;
        $groups = [];
        foreach ($this->listGroupCollections() as $group) {
            $members = $this->memberUris((string) $group['uri']);
            if (! in_array($principalUri, $members, true)) {
                continue;
            }
            $groups[] = [
                'id' => (string) $group['uri'],
                'displayName' => (string) $group['title'],
            ];
        }

        return $groups;
    }

    /**
     * @return list<array{uri: string, title: string}>
     */
    private function listGroupCollections(): array
    {
        $prefix = AdminConstants::GROUP_PREFIX;
        $rows = Principal::query()
            ->where('uri', 'like', $prefix.'%')
            ->orderBy('uri')
            ->get(['uri', 'displayname']);

        $out = [];
        foreach ($rows as $row) {
            $uri = (string) $row->uri;
            $title = trim((string) $row->displayname);
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
    private function memberUris(string $groupUri): array
    {
        $backend = new PrincipalBackend(DB::connection('wgw')->getPdo());

        return $backend->getGroupMemberSet($groupUri);
    }

    /**
     * @param  list<string>  $members
     */
    private function writeMembers(string $groupUri, array $members): void
    {
        $backend = new PrincipalBackend(DB::connection('wgw')->getPdo());
        $backend->setGroupMemberSet($groupUri, $members);
    }

    private function toMemberPrincipalUri(string $entry): string
    {
        $entry = trim($entry);
        if ($entry === '') {
            return '';
        }
        if (str_starts_with($entry, 'principals/')) {
            return $entry;
        }

        return 'principals/'.strtolower($entry);
    }
}
