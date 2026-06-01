<?php

declare(strict_types=1);

namespace App\Services\Plugins;

use App\Support\AppPaths;
use App\Support\InstallLayout;
use App\Support\SafePath;

/**
 * Resolves plugin manifest and static asset locations (bundled or wgw-plugins).
 */
final class PluginPaths
{
    public function __construct(private AppPaths $paths) {}

    /**
     * @return list<string>
     */
    public function bundledManifestPaths(): array
    {
        $manifests = [];
        foreach ($this->appsRoots() as $appsRoot) {
            if (! SafePath::isDir($appsRoot)) {
                continue;
            }
            $entries = @scandir($appsRoot);
            if (! is_array($entries)) {
                continue;
            }
            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }
                $manifest = $appsRoot.'/'.$entry.'/plugin.json';
                if (SafePath::isReadable($manifest)) {
                    $manifests[] = $manifest;
                }
            }
        }

        return array_values(array_unique($manifests));
    }

    /**
     * @return list<string>
     */
    public function runtimeManifestPaths(): array
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

    /**
     * @return list<string>
     */
    public function allManifestPaths(): array
    {
        return array_values(array_unique([
            ...$this->bundledManifestPaths(),
            ...$this->runtimeManifestPaths(),
        ]));
    }

    public function indexPathForManifest(string $manifestPath): ?string
    {
        $manifestPath = rtrim(str_replace('\\', '/', $manifestPath), '/');
        $pluginDir = dirname($manifestPath);
        $index = $this->isRuntimeManifest($manifestPath)
            ? $pluginDir.'/assets/index.html'
            : $pluginDir.'/build/index.html';

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

    /**
     * @return list<string>
     */
    private function appsRoots(): array
    {
        return InstallLayout::pathCandidates(
            $this->paths->installRoot(),
            fn (string $root): array => [$root.'/packages/apps'],
        );
    }

    private function isRuntimeManifest(string $manifestPath): bool
    {
        $pluginsRoot = rtrim(str_replace('\\', '/', $this->paths->pluginsRoot()), '/');
        $manifestPath = rtrim(str_replace('\\', '/', $manifestPath), '/');

        return $manifestPath === $pluginsRoot
            || str_starts_with($manifestPath.'/', $pluginsRoot.'/');
    }
}
