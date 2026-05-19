<?php

declare(strict_types=1);

namespace App\Services\Office;

use App\Support\AppPaths;
use App\Support\WgwSettings;

final class OfficeCapabilitiesService
{
    public function __construct(private AppPaths $paths)
    {
    }

    /**
     * @return array{enabled: bool, indexReady: bool, editorReady: bool}
     */
    public function snapshot(): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'enabled' => (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true),
            'indexReady' => $this->paths->officeIndex() !== null,
            'editorReady' => $this->paths->officeEditorReady(),
        ];
    }
}
