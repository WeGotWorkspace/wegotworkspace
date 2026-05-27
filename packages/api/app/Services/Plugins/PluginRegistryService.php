<?php

declare(strict_types=1);

namespace App\Services\Plugins;

use App\Models\AppSetting;
use App\Support\AppPaths;
use App\Support\WgwSettings;

final class PluginRegistryService
{
    private const ACTIVE_OVERRIDES_SETTING = 'plugins_active_overrides';

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
        $pluginsById = [];
        foreach ($this->loadRuntimePlugins() as $plugin) {
            $pluginsById[$plugin['id']] = $plugin;
        }

        $bundled = $this->bundledOnlyOfficePlugin();
        if (! isset($pluginsById[$bundled['id']])) {
            $pluginsById[$bundled['id']] = $bundled;
        }

        $plugins = array_values($pluginsById);
        $overrides = $this->activeOverrides();
        foreach ($plugins as &$plugin) {
            $id = (string) ($plugin['id'] ?? '');
            if ($id !== '' && array_key_exists($id, $overrides)) {
                $plugin['active'] = (bool) $overrides[$id];
            }
        }
        unset($plugin);

        return $plugins;
    }

    /**
     * @return array{
     *   plugin: array{
     *     id: string,
     *     name: string,
     *     active: bool,
     *     source: string
     *   },
     *   plugins: list<array{
     *     id: string,
     *     name: string,
     *     active: bool,
     *     source: string
     *   }>
     * }|null
     */
    public function setActive(string $id, bool $active): ?array
    {
        $id = trim($id);
        if ($id === '') {
            return null;
        }

        $existing = $this->list();
        $knownIds = array_map(
            static fn (array $plugin): string => (string) ($plugin['id'] ?? ''),
            $existing,
        );
        if (! in_array($id, $knownIds, true)) {
            return null;
        }

        $overrides = $this->activeOverrides();
        $overrides[$id] = $active;
        AppSetting::setValue(self::ACTIVE_OVERRIDES_SETTING, $overrides);

        $plugins = $this->list();
        foreach ($plugins as $plugin) {
            if ((string) ($plugin['id'] ?? '') === $id) {
                return [
                    'plugin' => $plugin,
                    'plugins' => $plugins,
                ];
            }
        }

        return null;
    }

    /**
     * @return array{
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
     * }
     */
    private function bundledOnlyOfficePlugin(): array
    {
        $cfg = WgwSettings::normalized();
        $filesEnabled = (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true);
        $officeIndexReady = $this->paths->officeIndex() !== null;

        return [
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
        ];
    }

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
    private function loadRuntimePlugins(): array
    {
        $root = $this->paths->pluginsRoot();
        $entries = @scandir($root);
        if (! is_array($entries)) {
            return [];
        }

        $plugins = [];
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $dir = $root.'/'.$entry;
            if (! is_dir($dir)) {
                continue;
            }
            $manifest = $dir.'/plugin.json';
            if (! is_readable($manifest)) {
                continue;
            }
            $raw = @file_get_contents($manifest);
            if (! is_string($raw) || $raw === '') {
                continue;
            }
            try {
                $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                continue;
            }
            if (! is_array($data)) {
                continue;
            }
            $normalized = $this->normalizeManifestPlugin($data);
            if ($normalized !== null) {
                $plugins[] = $normalized;
            }
        }

        return $plugins;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{
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
     * }|null
     */
    private function normalizeManifestPlugin(array $data): ?array
    {
        $id = isset($data['id']) && is_string($data['id']) ? trim($data['id']) : '';
        if ($id === '') {
            return null;
        }
        $name = isset($data['name']) && is_string($data['name']) && trim($data['name']) !== ''
            ? trim($data['name'])
            : $id;
        $active = ! isset($data['active']) || (bool) $data['active'];
        $plugin = [
            'id' => $id,
            'name' => $name,
            'active' => $active,
            'source' => 'runtime',
        ];

        if (isset($data['appTile']) && is_array($data['appTile'])) {
            $route = isset($data['appTile']['route']) && is_string($data['appTile']['route'])
                ? trim($data['appTile']['route'])
                : '';
            if ($route !== '') {
                $plugin['appTile'] = [
                    'id' => isset($data['appTile']['id']) && is_string($data['appTile']['id']) && trim($data['appTile']['id']) !== ''
                        ? trim($data['appTile']['id'])
                        : $id,
                    'label' => isset($data['appTile']['label']) && is_string($data['appTile']['label']) && trim($data['appTile']['label']) !== ''
                        ? trim($data['appTile']['label'])
                        : $name,
                    'route' => $route,
                ];
                if (isset($data['appTile']['icon']) && is_string($data['appTile']['icon'])) {
                    $icon = trim($data['appTile']['icon']);
                    if ($icon !== '') {
                        $plugin['appTile']['icon'] = $icon;
                    }
                }
            }
        }

        if (isset($data['drive']) && is_array($data['drive'])) {
            $drive = [];
            if (isset($data['drive']['openFileExtensions']) && is_array($data['drive']['openFileExtensions'])) {
                $extensions = [];
                foreach ($data['drive']['openFileExtensions'] as $extension) {
                    if (! is_string($extension)) {
                        continue;
                    }
                    $normalized = strtolower(trim($extension));
                    if ($normalized !== '') {
                        $extensions[] = $normalized;
                    }
                }
                if ($extensions !== []) {
                    $drive['openFileExtensions'] = array_values(array_unique($extensions));
                }
            }
            foreach (['openFileRoute', 'openFileQueryParam'] as $field) {
                if (isset($data['drive'][$field]) && is_string($data['drive'][$field])) {
                    $value = trim($data['drive'][$field]);
                    if ($value !== '') {
                        $drive[$field] = $value;
                    }
                }
            }
            if (isset($data['drive']['newFileTemplates']) && is_array($data['drive']['newFileTemplates'])) {
                $templates = [];
                foreach ($data['drive']['newFileTemplates'] as $template) {
                    if (! is_array($template)) {
                        continue;
                    }
                    $idValue = isset($template['id']) && is_string($template['id']) ? trim($template['id']) : '';
                    $label = isset($template['label']) && is_string($template['label']) ? trim($template['label']) : '';
                    $kind = isset($template['kind']) && is_string($template['kind']) ? trim($template['kind']) : '';
                    $queryValue = isset($template['queryValue']) && is_string($template['queryValue']) ? trim($template['queryValue']) : '';
                    if ($idValue === '' || $label === '' || $queryValue === '') {
                        continue;
                    }
                    if (! in_array($kind, ['doc', 'sheet', 'slides'], true)) {
                        continue;
                    }
                    $templates[] = [
                        'id' => $idValue,
                        'label' => $label,
                        'kind' => $kind,
                        'queryValue' => $queryValue,
                    ];
                }
                if ($templates !== []) {
                    $drive['newFileTemplates'] = $templates;
                }
            }
            if ($drive !== []) {
                $plugin['drive'] = $drive;
            }
        }

        return $plugin;
    }

    /**
     * @return array<string, bool>
     */
    private function activeOverrides(): array
    {
        $value = AppSetting::getValue(self::ACTIVE_OVERRIDES_SETTING, []);
        if (! is_array($value)) {
            return [];
        }
        $normalized = [];
        foreach ($value as $id => $active) {
            if (! is_string($id) || trim($id) === '') {
                continue;
            }
            $normalized[trim($id)] = (bool) $active;
        }

        return $normalized;
    }
}
