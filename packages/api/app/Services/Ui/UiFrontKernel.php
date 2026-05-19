<?php

declare(strict_types=1);

namespace App\Services\Ui;

use App\Services\Installer\InstallerWebBase;
use App\Support\AppPaths;
use App\Ui\UiStaticServer;

final class UiFrontKernel
{
    public function __construct(
        private AppPaths $paths,
        private UiStaticServer $static,
    ) {
    }

    public function tryHandle(string $path): bool
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'GET' && $method !== 'HEAD') {
            return false;
        }

        $webBase = InstallerWebBase::detect();

        if ($this->static->matchesInstallPath($webBase, $path)) {
            return $this->handleInstall($webBase, $path, $method);
        }

        if (! $this->paths->isInstalled()) {
            return false;
        }

        if ($this->static->matchesShellPath($webBase, $path)) {
            return $this->handleShell($webBase, $path, $method);
        }

        return false;
    }

    private function handleInstall(string $webBase, string $path, string $method): bool
    {
        if ($this->paths->isInstalled()) {
            if ($method === 'HEAD') {
                http_response_code(200);

                return true;
            }
            $this->respondAlreadyInstalled($webBase);

            return true;
        }

        $dist = $this->paths->moduleDistRoot('install');
        if ($dist === null) {
            $this->respondDistMissing('install');

            return true;
        }

        if ($method === 'HEAD') {
            http_response_code(200);

            return true;
        }

        if ($this->static->tryServe($dist, $webBase, $path, true)) {
            return true;
        }

        $this->respondNotFound();

        return true;
    }

    private function handleShell(string $webBase, string $path, string $method): bool
    {
        $dist = $this->paths->shellDistRoot();
        if ($dist === null) {
            $this->respondDistMissing('shell');

            return true;
        }

        if ($method === 'HEAD') {
            http_response_code(200);

            return true;
        }

        if ($this->static->tryServe($dist, $webBase, $path, true)) {
            return true;
        }

        $module = $this->moduleForPath($webBase, $path);
        if ($module !== null && $module !== 'shell') {
            $moduleDist = $this->paths->moduleDistRoot($module);
            if ($moduleDist !== null && $this->static->tryServe($moduleDist, $webBase, $path, true)) {
                return true;
            }
        }

        $this->respondNotFound();

        return true;
    }

    private function moduleForPath(string $webBase, string $path): ?string
    {
        foreach (['drive', 'mail', 'meet', 'voice', 'notes', 'settings', 'admin'] as $module) {
            $prefix = InstallerWebBase::url($webBase, '/'.$module);
            if ($path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/')) {
                return $module === 'meet' ? 'voice' : $module;
            }
        }

        return null;
    }

    private function respondAlreadyInstalled(string $webBase): void
    {
        $home = InstallerWebBase::url($webBase, '/');
        header('Content-Type: text/html; charset=utf-8');
        http_response_code(200);
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
        echo '<h1>Already installed</h1>';
        echo '<p><a href="'.htmlspecialchars($home, ENT_QUOTES, 'UTF-8').'">Open WeGotWorkspace</a></p>';
        echo '</body></html>';
    }

    private function respondDistMissing(string $module): void
    {
        header('Content-Type: text/html; charset=utf-8');
        http_response_code(503);
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
        echo '<h1>UI build missing</h1>';
        echo '<p>Run <code>pnpm --filter @wgw/apps build</code> to generate <code>'.$module.'/dist</code>.</p>';
        echo '</body></html>';
    }

    private function respondNotFound(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
    }
}
