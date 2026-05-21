<?php

declare(strict_types=1);

namespace App\Services\Notes;

use App\Support\AppPaths;
use App\Support\WgwSettings;

final class NotesCapabilitiesService
{
    public function __construct(private AppPaths $paths)
    {
    }

    /**
     * @return array{enabled: bool, distReady: bool, baseUri: string}
     */
    public function snapshot(): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'enabled' => (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true),
            'distReady' => $this->paths->appDistIndex('notes') !== null,
            'baseUri' => (string) ($cfg[WgwSettings::BASE_URI] ?? '/'),
        ];
    }

}
