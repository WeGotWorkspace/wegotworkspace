<?php

declare(strict_types=1);

namespace App\Services\Ui;

use App\Services\Installer\InstallerWebBase;
use App\Support\AppPaths;
use App\Ui\OfficeStaticServer;
use App\Ui\UiStaticServer;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class UiFrontKernel
{
    public function __construct(
        private AppPaths $paths,
        private UiStaticServer $static,
        private OfficeStaticServer $officeStatic,
        private OfficeHtmlResponder $officeHtml,
    ) {
    }

    public function handle(Request $request): ?Response
    {
        $method = strtoupper($request->method());
        if ($method !== 'GET' && $method !== 'HEAD') {
            return null;
        }

        // Sabre Browser plugin serves HTML/CSS at ?sabreAction=… on the DAV base URI (often "/").
        if ($request->query->has('sabreAction')) {
            return null;
        }

        $path = $request->getPathInfo() ?: '/';
        $webBase = InstallerWebBase::detect();

        if ($this->static->matchesInstallPath($webBase, $path)) {
            return $this->handleInstall($webBase, $path, $method);
        }

        if (! $this->paths->isInstalled()) {
            return null;
        }

        if ($this->officeStatic->matchesOfficePath($webBase, $path)) {
            return $this->handleOffice($webBase, $path, $method);
        }

        if ($this->static->matchesShellPath($webBase, $path)) {
            return $this->handleShell($webBase, $path, $method);
        }

        return null;
    }

    private function handleInstall(string $webBase, string $path, string $method): Response
    {
        if ($this->paths->isInstalled()) {
            if ($method === 'HEAD') {
                return response('', 200);
            }

            return $this->alreadyInstalled($webBase);
        }

        $dist = $this->paths->moduleDistRoot('install');
        if ($dist === null) {
            return $this->distMissing('install');
        }

        if ($method === 'HEAD') {
            return response('', 200);
        }

        $served = $this->static->tryServe($dist, $webBase, $path, true);

        return $served ?? $this->notFound();
    }

    private function handleOffice(string $webBase, string $path, string $method): Response
    {
        if ($method === 'HEAD') {
            return response('', 200);
        }

        $html = $this->officeHtml->tryRespond($webBase, $path);
        if ($html !== null) {
            return $html;
        }

        $index = $this->paths->officeIndex();
        if ($index === null) {
            return $this->distMissing('office');
        }

        $buildRoot = dirname($index);
        $served = $this->officeStatic->tryServe($buildRoot, $webBase, $path);

        return $served ?? $this->notFound();
    }

    private function handleShell(string $webBase, string $path, string $method): Response
    {
        $dist = $this->paths->shellDistRoot();
        if ($dist === null) {
            return $this->distMissing('shell');
        }

        if ($method === 'HEAD') {
            return response('', 200);
        }

        $served = $this->static->tryServe($dist, $webBase, $path, true);

        return $served ?? $this->notFound();
    }

    private function alreadyInstalled(string $webBase): Response
    {
        $home = InstallerWebBase::url($webBase, '/');
        $html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
        $html .= '<h1>Already installed</h1>';
        $html .= '<p><a href="'.htmlspecialchars($home, ENT_QUOTES, 'UTF-8').'">Open WeGotWorkspace</a></p>';
        $html .= '</body></html>';

        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    private function distMissing(string $module): Response
    {
        $html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
        $html .= '<h1>UI build missing</h1>';
        $html .= '<p>Run <code>pnpm --filter @wgw/apps build</code> to generate <code>'.$module.'/dist</code>.</p>';
        $html .= '</body></html>';

        return response($html, 503, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    private function notFound(): Response
    {
        return response('Not found', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
    }
}
