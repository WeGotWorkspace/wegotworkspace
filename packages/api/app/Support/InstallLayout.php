<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Detect monorepo vs release install layout for path candidate ordering.
 */
final class InstallLayout
{
    public static function monorepoRoot(string $installRoot): ?string
    {
        $normalized = rtrim(str_replace('\\', '/', $installRoot), '/');
        if (! str_ends_with($normalized, '/apps/wegotworkspace')) {
            return null;
        }

        return dirname($normalized, 2);
    }

    /**
     * @param  callable(string): list<string>  $pathsForRoot
     * @return list<string>
     */
    public static function pathCandidates(string $installRoot, callable $pathsForRoot): array
    {
        $repo = self::monorepoRoot($installRoot);
        if ($repo === null) {
            return $pathsForRoot($installRoot);
        }

        return array_values(array_unique([
            ...$pathsForRoot($repo),
            ...$pathsForRoot($installRoot),
        ]));
    }
}
