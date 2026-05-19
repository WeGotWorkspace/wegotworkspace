<?php

declare(strict_types=1);

namespace App\Ui;

use App\Services\Installer\InstallerWebBase;

/**
 * Serves the ONLYOFFICE Web static export at {@code /office/}.
 */
final class OfficeStaticServer
{
    public function matchesOfficePath(string $webBase, string $path): bool
    {
        $prefix = InstallerWebBase::url($webBase, '/office');

        return $path === $prefix || str_starts_with($path, $prefix.'/');
    }

    public function tryServe(string $buildRoot, string $webBase, string $path): bool
    {
        $prefix = InstallerWebBase::url($webBase, '/office');
        if ($path !== $prefix && ! str_starts_with($path, $prefix.'/')) {
            return false;
        }

        $root = rtrim($buildRoot, '/');
        if (! is_file($root.'/index.html')) {
            return false;
        }

        $rel = $path === $prefix || $path === $prefix.'/' ? '' : substr($path, strlen($prefix) + 1);
        $rel = str_replace('\\', '/', (string) $rel);
        $rel = rawurldecode($rel);
        if ($rel !== '' && (str_contains($rel, "\0") || str_contains($rel, '..'))) {
            $this->respondNotFound();

            return true;
        }

        $fs = $this->mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            $this->respondNotFound();

            return true;
        }

        $realRoot = realpath($root);
        $realFile = is_readable($fs) ? realpath($fs) : false;
        if ($realRoot === false || $realFile === false || ! str_starts_with($realFile, $realRoot)) {
            $this->respondNotFound();

            return true;
        }

        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'js', 'mjs' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'html', 'htm' => 'text/html; charset=utf-8',
            'wasm' => 'application/wasm',
            'json', 'map' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
            'txt' => 'text/plain; charset=utf-8',
            'xml' => 'application/xml; charset=utf-8',
            default => 'application/octet-stream',
        };

        header('Content-Type: '.$mime);
        if ($ext === 'wasm' && $this->wasmOnDiskIsBrotliCompressed($realFile)) {
            header('Content-Encoding: br');
        }
        if (in_array($ext, ['html', 'htm', 'js', 'mjs', 'css', 'json', 'map'], true)) {
            header('Cache-Control: no-store, no-cache, must-revalidate');
        } else {
            header('Cache-Control: public, max-age=86400');
        }

        readfile($realFile);

        return true;
    }

    private function mapUrlToFilesystem(string $root, string $rel): ?string
    {
        $rel = ltrim($rel, '/');
        if ($rel === '' || $rel === 'index.html') {
            return $root.'/index.html';
        }

        $bundleVersion = $this->detectBundleVersion($root);
        if ($bundleVersion !== null) {
            if (str_starts_with($rel, 'apps/')) {
                $rel = $bundleVersion.'/web-apps/'.$rel;
            } elseif (str_starts_with($rel, 'sdkjs/')) {
                $rel = $bundleVersion.'/'.$rel;
            }
        }

        $direct = $root.'/'.$rel;
        if (is_file($direct)) {
            return $direct;
        }

        $asHtml = $root.'/'.$rel.'.html';
        if (is_file($asHtml)) {
            return $asHtml;
        }

        $indexUnder = $root.'/'.$rel.'/index.html';
        if (is_file($indexUnder)) {
            return $indexUnder;
        }

        return null;
    }

    private function detectBundleVersion(string $root): ?string
    {
        $entries = @scandir($root);
        if (! is_array($entries)) {
            return null;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $candidate = $root.'/'.$entry;
            if (! is_dir($candidate)) {
                continue;
            }
            if (is_dir($candidate.'/web-apps')) {
                return $entry;
            }
        }

        return null;
    }

    private function wasmOnDiskIsBrotliCompressed(string $path): bool
    {
        $h = @file_get_contents($path, false, null, 0, 4);

        return $h !== false
            && strlen($h) === 4
            && $h !== "\0asm";
    }

    private function respondNotFound(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
    }
}
