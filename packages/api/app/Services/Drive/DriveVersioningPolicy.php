<?php

declare(strict_types=1);

namespace App\Services\Drive;

final class DriveVersioningPolicy
{
    private const BINARY_PROBE_BYTES = 8192;

    /** @var \finfo|false|null */
    private mixed $finfo = null;

    public function resolveFromStorageKey(string $key): ?DriveGitScope
    {
        $key = ltrim(str_replace('\\', '/', trim($key)), '/');
        if ($key === '') {
            return null;
        }

        $segments = explode('/', $key);
        if (count($segments) < 3) {
            return null;
        }

        $root = $segments[0] ?? '';
        if ($root !== 'users' && $root !== 'groups') {
            return null;
        }

        $principal = $segments[1] ?? '';
        if ($principal === '') {
            return null;
        }

        $relative = implode('/', array_slice($segments, 2));
        if ($relative === '') {
            return null;
        }

        return new DriveGitScope($root.'/'.$principal, $relative);
    }

    public function shouldVersion(string $absolutePath, string $storageKey): bool
    {
        if ($this->isExcludedStorageKey($storageKey)) {
            return false;
        }

        if (! is_file($absolutePath)) {
            return false;
        }

        $maxBytes = (int) config('wgw.git_versioning.max_bytes', 8 * 1024 * 1024);
        if (filesize($absolutePath) > $maxBytes) {
            return false;
        }

        return ! $this->isBinary($absolutePath);
    }

    public function isBinary(string $absolutePath): bool
    {
        if (! is_file($absolutePath)) {
            return true;
        }

        $chunk = $this->readProbe($absolutePath);
        if ($chunk === null) {
            return true;
        }

        if (str_contains($chunk, "\x00")) {
            return true;
        }

        $mime = $this->detectMime($absolutePath);
        if ($mime === null) {
            return false;
        }

        if ($this->isAllowedTextMime($mime)) {
            return false;
        }

        if ($this->isDeniedBinaryMime($mime)) {
            return true;
        }

        return false;
    }

    private function readProbe(string $absolutePath): ?string
    {
        $handle = fopen($absolutePath, 'rb');
        if ($handle === false) {
            return null;
        }

        try {
            $chunk = fread($handle, self::BINARY_PROBE_BYTES);

            return $chunk === false ? null : $chunk;
        } finally {
            fclose($handle);
        }
    }

    private function detectMime(string $absolutePath): ?string
    {
        $finfo = $this->mimeDetector();
        if ($finfo === false) {
            return null;
        }

        $mime = finfo_file($finfo, $absolutePath);
        if (! is_string($mime) || $mime === '') {
            return null;
        }

        return strtolower($mime);
    }

    private function mimeDetector(): \finfo|false
    {
        if ($this->finfo === null) {
            $this->finfo = function_exists('finfo_open')
                ? finfo_open(FILEINFO_MIME_TYPE)
                : false;
        }

        return $this->finfo;
    }

    private function isAllowedTextMime(string $mime): bool
    {
        if (str_starts_with($mime, 'text/')) {
            return true;
        }

        static $allowed = [
            'application/json',
            'application/ld+json',
            'application/xml',
            'application/javascript',
            'application/ecmascript',
            'application/yaml',
            'application/x-yaml',
            'application/csv',
            'application/sql',
            'application/graphql',
            'application/x-php',
            'application/x-sh',
            'application/x-httpd-php',
            'image/svg+xml',
        ];

        return in_array($mime, $allowed, true);
    }

    private function isDeniedBinaryMime(string $mime): bool
    {
        if ($this->isAllowedTextMime($mime)) {
            return false;
        }

        if (str_starts_with($mime, 'image/')) {
            return true;
        }

        if (str_starts_with($mime, 'video/') || str_starts_with($mime, 'audio/')) {
            return true;
        }

        if (str_starts_with($mime, 'application/vnd.')) {
            return true;
        }

        static $denied = [
            'application/pdf',
            'application/zip',
            'application/x-zip-compressed',
            'application/gzip',
            'application/x-gzip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-msdownload',
            'application/x-executable',
            'application/x-dosexec',
            'application/msword',
            'application/wasm',
            'application/x-wasm',
        ];

        return in_array($mime, $denied, true);
    }

    private function isExcludedStorageKey(string $storageKey): bool
    {
        $normalized = ltrim(str_replace('\\', '/', trim($storageKey)), '/');
        if ($normalized === '') {
            return true;
        }

        if (str_contains($normalized, '/.notes/')) {
            return true;
        }

        foreach (explode('/', $normalized) as $segment) {
            if ($segment === '') {
                continue;
            }
            if ($segment[0] === '.') {
                return true;
            }
        }

        return false;
    }
}
