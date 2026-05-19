<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Storage\StoragePaths;

final class DriveSessionStore
{
    private const SESSION_KEY = 'drive_cwd';

    public function __construct(private StoragePaths $paths)
    {
    }

    public function getCwd(): ?string
    {
        $cwd = session(self::SESSION_KEY);

        return is_string($cwd) ? $this->paths->normalizeVirtualPath($cwd) : null;
    }

    public function setCwd(string $cwd): void
    {
        session([self::SESSION_KEY => $this->paths->normalizeVirtualPath($cwd)]);
    }

    /**
     * @param list<string> $groupSlugs
     */
    public function resolveCwd(?string $requested, string $username, array $groupSlugs): string
    {
        if ($requested !== null && $requested !== '') {
            $cwd = $this->paths->normalizeVirtualPath($requested);
            if ($this->paths->isPathAllowed($cwd, $username, $groupSlugs, false)) {
                $this->setCwd($cwd);

                return $cwd;
            }
        }

        $session = $this->getCwd();
        if ($session !== null && $this->paths->isPathAllowed($session, $username, $groupSlugs, false)) {
            return $session;
        }

        $fallback = $this->paths->normalizeVirtualPath('/users/'.$username);
        $this->setCwd($fallback);

        return $fallback;
    }
}
