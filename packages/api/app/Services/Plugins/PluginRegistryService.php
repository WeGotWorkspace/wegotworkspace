<?php

declare(strict_types=1);

namespace App\Services\Plugins;

use App\Support\AppPaths;
use App\Support\WgwSettings;

final class PluginRegistryService
{
    public function __construct(private AppPaths $paths) {}

    /**
     * @return list<array{
     *   id: string,
     *   name: string,
     *   active: bool,
     *   source: string,
     *   appTile?: array{id: string, label: string, route: string, icon?: string},
     *   drive?: array{
     *     openFileExtensions?: list<string>,
     *     openFileRoute?: string,
     *     openFileQueryParam?: string,
     *     newFileTemplates?: list<array{
     *       id: string,
     *       label: string,
     *       kind: string,
     *       queryValue: string
     *     }>
     *   }
     * }>
     */
    public function list(): array
    {
        $cfg = WgwSettings::normalized();
        $filesEnabled = (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true);
        $officeIndexReady = $this->paths->officeIndex() !== null;

        return [[
            'id' => 'onlyoffice',
            'name' => 'ONLYOFFICE',
            'active' => $filesEnabled && $officeIndexReady,
            'source' => 'bundled',
            'appTile' => [
                'id' => 'office',
                'label' => 'Office',
                'route' => '/office',
                'icon' => 'file-text',
            ],
            'drive' => [
                'openFileExtensions' => ['docx', 'xlsx', 'pptx'],
                'openFileRoute' => '/office/editor',
                'openFileQueryParam' => 'file',
                'newFileTemplates' => [
                    [
                        'id' => 'onlyoffice-docx',
                        'label' => 'New document',
                        'kind' => 'doc',
                        'queryValue' => 'docx',
                    ],
                    [
                        'id' => 'onlyoffice-xlsx',
                        'label' => 'New spreadsheet',
                        'kind' => 'sheet',
                        'queryValue' => 'xlsx',
                    ],
                    [
                        'id' => 'onlyoffice-pptx',
                        'label' => 'New presentation',
                        'kind' => 'slides',
                        'queryValue' => 'pptx',
                    ],
                ],
            ],
        ]];
    }
}
