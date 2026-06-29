<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Models\FileShareGrant;

/**
 * Effective access for a presented share credential. This is the single reuse
 * point for any future Sabre/WebDAV backend: resolve a token (+ optional
 * confirmed-email access token) into an owner-scoped target path and permission.
 */
final readonly class ResolvedShareAccess
{
    public function __construct(
        public string $shareId,
        public string $ownerUsername,
        public string $targetPath,
        public string $targetType,
        public string $permission,
    ) {}

    public function canWrite(): bool
    {
        return $this->permission === FileShareGrant::PERMISSION_WRITE;
    }

    public function isDirectory(): bool
    {
        return $this->targetType === 'dir';
    }
}
