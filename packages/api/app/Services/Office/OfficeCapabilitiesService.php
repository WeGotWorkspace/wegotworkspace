<?php

declare(strict_types=1);

namespace App\Services\Office;

use App\Services\Plugins\PluginRegistryService;
use App\Support\WgwSettings;

final class OfficeCapabilitiesService
{
    public function __construct(private PluginRegistryService $plugins) {}

    /**
     * @return array{enabled: bool, indexReady: bool, editorReady: bool}
     */
    public function snapshot(): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'enabled' => (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true),
            'indexReady' => $this->plugins->routeAssetIndex('/office') !== null,
            'editorReady' => $this->plugins->routeEditorReady('/office'),
        ];
    }
}
