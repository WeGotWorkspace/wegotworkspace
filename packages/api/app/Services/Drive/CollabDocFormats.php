<?php

declare(strict_types=1);

namespace App\Services\Drive;

final class CollabDocFormats
{
    /** @var array<string, string> */
    private array $byExtension = [
        'md' => 'markdown',
        'markdown' => 'markdown',
    ];

    public function isCollabDocPath(string $virtualPath): bool
    {
        return $this->docTypeForPath($virtualPath) !== null;
    }

    public function docTypeForPath(string $virtualPath): ?string
    {
        $ext = strtolower(pathinfo($virtualPath, PATHINFO_EXTENSION));
        if ($ext === '') {
            return null;
        }

        return $this->byExtension[$ext] ?? null;
    }
}
