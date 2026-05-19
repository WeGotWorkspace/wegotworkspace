<?php

declare(strict_types=1);

namespace App\Support;

final class AppVersion
{
    public function __construct(private WgwInstallConfig $install)
    {
    }

    public function current(): string
    {
        $candidates = [
            dirname($this->install->installRoot(), 2).'/VERSION',
            $this->install->installRoot().'/VERSION',
        ];

        foreach ($candidates as $path) {
            if (! is_readable($path)) {
                continue;
            }
            $raw = trim((string) file_get_contents($path));
            if ($raw !== '') {
                return $raw;
            }
        }

        return '0.0.0-dev';
    }
}
