<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Services\Drive\DriveService;
use App\Support\WgwSettings;

/**
 * Site-level guard mirroring {@see DriveService::assertFilesEnabled()}:
 * public sharing requires both files and the public-shares toggle to be enabled.
 */
final class ShareAvailability
{
    public function assertEnabled(): void
    {
        $cfg = WgwSettings::normalized();
        if (! (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true)) {
            throw new \RuntimeException('WebDAV files are disabled for this site.');
        }
        if (! (bool) ($cfg[WgwSettings::PUBLIC_SHARES_ENABLED] ?? true)) {
            throw new \RuntimeException('Public file sharing is disabled for this site.');
        }
    }
}
