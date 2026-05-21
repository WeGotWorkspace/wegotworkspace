<?php

declare(strict_types=1);

namespace App\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

final class WgwStorage
{
    public function __construct(private StoragePaths $paths) {}

    public function paths(): StoragePaths
    {
        return $this->paths;
    }

    public function data(): Filesystem
    {
        return Storage::disk('wgw_data');
    }

    public function files(): Filesystem
    {
        return Storage::disk('wgw_files');
    }

    public function notes(): Filesystem
    {
        return Storage::disk('wgw_notes');
    }

    public function putVirtual(string $virtualPath, string $contents): void
    {
        $this->files()->put(
            $this->paths->virtualToStorageKey($virtualPath),
            $contents
        );
    }

    public function getVirtual(string $virtualPath): ?string
    {
        $key = $this->paths->virtualToStorageKey($virtualPath);
        if (! $this->files()->exists($key)) {
            return null;
        }

        return $this->files()->get($key);
    }
}
