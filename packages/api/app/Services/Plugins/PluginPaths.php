<?php

declare(strict_types=1);

namespace App\Services\Plugins;

use App\Support\AppPaths;
use App\Support\SafePath;

/**
 * Resolves plugin manifests and static assets under {@code wgw-plugins/}.
 */
final class PluginPaths
{
    public function __construct(private AppPaths $paths) {}

    /**
     * @return list<string>
     */
    public function installedManifestPaths(): array
    {
        $root = $this->paths->pluginsRoot();
        $entries = @scandir($root);
        if (! is_array($entries)) {
            return [];
        }

        $manifests = [];
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $manifest = $root.'/'.$entry.'/plugin.json';
            if (SafePath::isReadable($manifest)) {
                $manifests[] = $manifest;
            }
        }

        return $manifests;
    }

    public function indexPathForManifest(string $manifestPath): ?string
    {
        $manifestPath = rtrim(str_replace('\\', '/', $manifestPath), '/');
        $pluginDir = dirname($manifestPath);
        $index = $pluginDir.'/assets/index.html';

        return SafePath::isHtmlFile($index) ? $index : null;
    }

    public function editorReadyForManifest(string $manifestPath): bool
    {
        $index = $this->indexPathForManifest($manifestPath);
        if ($index === null) {
            return false;
        }

        $root = dirname($index);
        if (SafePath::isReadable($root.'/editor.html')) {
            return true;
        }

        return SafePath::isReadable($root.'/editor/index.html');
    }
}
