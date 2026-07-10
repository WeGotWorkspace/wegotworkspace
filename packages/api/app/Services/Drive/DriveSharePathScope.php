<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Storage\StoragePaths;

final class DriveSharePathScope
{
    public function __construct(private StoragePaths $paths) {}

    public function normalize(string $path): string
    {
        return $this->paths->normalizeVirtualPath($path);
    }

    public function isWithin(string $rootPath, string $requestedPath): bool
    {
        $root = $this->normalize($rootPath);
        $path = $this->normalize($requestedPath);

        if ($root === '/') {
            return true;
        }

        return $path === $root || str_starts_with($path, $root.'/');
    }
}
