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
}
