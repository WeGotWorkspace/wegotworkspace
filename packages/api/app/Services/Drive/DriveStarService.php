<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Storage\StoragePaths;
use Illuminate\Support\Facades\DB;

final class DriveStarService
{
    public function __construct(private StoragePaths $paths) {}

    /**
     * @param  list<string>  $groupSlugs
     * @return list<string>
     */
    public function listPaths(string $username, array $groupSlugs): array
    {
        $rows = DB::connection('wgw')
            ->table('drive_starred_items')
            ->where('username', $username)
            ->orderByDesc('created_at')
            ->pluck('path');

        $out = [];
        foreach ($rows as $path) {
            if (! is_string($path)) {
                continue;
            }
            $normalized = $this->paths->normalizeVirtualPath($path);
            if (! $this->paths->isPathAllowed($normalized, $username, $groupSlugs, false)) {
                continue;
            }
            if ($this->isHiddenNotesPath($normalized)) {
                continue;
            }
            $out[] = $normalized;
        }

        return array_values(array_unique($out));
    }

    public function setStarred(string $username, string $path, bool $starred): void
    {
        $path = $this->paths->normalizeVirtualPath($path);
        if ($path === '/') {
            throw new \InvalidArgumentException('Cannot star root path.');
        }

        if ($starred) {
            DB::connection('wgw')->table('drive_starred_items')->updateOrInsert(
                ['username' => $username, 'path' => $path],
                ['created_at' => time()]
            );

            return;
        }

        DB::connection('wgw')
            ->table('drive_starred_items')
            ->where('username', $username)
            ->where('path', $path)
            ->delete();
    }

    private function isHiddenNotesPath(string $virtualPath): bool
    {
        return preg_match('#/(?:users|groups)/[^/]+/\.notes(?:/|$)#', $virtualPath) === 1;
    }
}
