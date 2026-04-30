<?php

declare(strict_types=1);

namespace App\Update;

final class ReleaseFeedClient
{
    /**
     * @return array<string, mixed>|null
     */
    public static function fetchLatest(string $feedUrl): ?array
    {
        $feedUrl = trim($feedUrl);
        if ($feedUrl === '') {
            return null;
        }
        $raw = self::fetchJsonText($feedUrl);
        if ($raw === null) {
            $apiFallback = self::githubApiUrlFromFeedUrl($feedUrl);
            if ($apiFallback !== null) {
                $raw = self::fetchJsonText($apiFallback);
                if ($raw !== null) {
                    $feedUrl = $apiFallback;
                }
            }
        }
        if ($raw === null) {
            return null;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $apiFallback = self::githubApiUrlFromFeedUrl($feedUrl);
            if ($apiFallback !== null && $apiFallback !== $feedUrl) {
                $raw = self::fetchJsonText($apiFallback);
                if ($raw !== null) {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $feedUrl = $apiFallback;
                    }
                }
            }
        }
        if (!is_array($decoded)) {
            return null;
        }

        if (isset($decoded['version']) && is_string($decoded['version'])) {
            return self::normalizeManifestMetadata($decoded, $feedUrl);
        }

        // Support GitHub Releases API payloads: /repos/{owner}/{repo}/releases/latest
        if (isset($decoded['tag_name']) && is_string($decoded['tag_name']) && isset($decoded['assets']) && is_array($decoded['assets'])) {
            $manifestAssetUrl = null;
            $zipAssetUrl = null;
            foreach ($decoded['assets'] as $asset) {
                if (!is_array($asset)) {
                    continue;
                }
                $name = isset($asset['name']) && is_string($asset['name']) ? $asset['name'] : '';
                $assetUrl = isset($asset['browser_download_url']) && is_string($asset['browser_download_url'])
                    ? $asset['browser_download_url']
                    : null;
                if ($assetUrl === null) {
                    continue;
                }
                if ($name === 'manifest.json') {
                    $manifestAssetUrl = $assetUrl;
                }
                if (str_ends_with($name, '.zip') && str_contains($name, 'wegotworkspace-deploy-')) {
                    $zipAssetUrl = $assetUrl;
                }
            }
            if ($manifestAssetUrl === null) {
                return null;
            }
            $manifestRaw = self::fetchJsonText($manifestAssetUrl);
            if ($manifestRaw === null) {
                return null;
            }
            $manifest = json_decode($manifestRaw, true);
            if (!is_array($manifest)) {
                return null;
            }
            if ((!isset($manifest['package_url']) || !is_string($manifest['package_url']) || trim($manifest['package_url']) === '') && $zipAssetUrl !== null) {
                $manifest['package_url'] = $zipAssetUrl;
            }
            if ((!isset($manifest['notes_url']) || !is_string($manifest['notes_url']) || trim($manifest['notes_url']) === '') && isset($decoded['html_url']) && is_string($decoded['html_url'])) {
                $manifest['notes_url'] = $decoded['html_url'];
            }

            return self::normalizeManifestMetadata($manifest, $manifestAssetUrl);
        }

        return null;
    }

    private static function fetchJsonText(string $url): ?string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            if ($ch !== false) {
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_TIMEOUT => 20,
                    CURLOPT_HTTPHEADER => [
                        'Accept: application/json',
                        'User-Agent: WeGotWorkspace-Updater/1.0',
                    ],
                ]);
                $raw = curl_exec($ch);
                $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                if (is_string($raw) && $raw !== '' && $status >= 200 && $status < 400) {
                    return $raw;
                }
            }
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 20,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\nUser-Agent: WeGotWorkspace-Updater/1.0\r\n",
            ],
        ]);
        $raw = @file_get_contents($url, false, $ctx);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        return $raw;
    }

    /**
     * @param array<string, mixed> $manifest
     *
     * @return array<string, mixed>
     */
    private static function normalizeManifestMetadata(array $manifest, string $manifestUrl): array
    {
        $version = isset($manifest['version']) && is_string($manifest['version']) ? trim($manifest['version']) : '';
        if ($version === '') {
            return $manifest;
        }
        $versionNoV = str_starts_with($version, 'v') ? substr($version, 1) : $version;

        $packageUrl = isset($manifest['package_url']) && is_string($manifest['package_url'])
            ? trim($manifest['package_url'])
            : '';
        if ($packageUrl === '' && str_ends_with($manifestUrl, '/manifest.json')) {
            $base = substr($manifestUrl, 0, -strlen('/manifest.json'));
            $manifest['package_url'] = $base.'/wegotworkspace-deploy-'.$versionNoV.'.zip';
        }

        $notesUrl = isset($manifest['notes_url']) && is_string($manifest['notes_url'])
            ? trim($manifest['notes_url'])
            : '';
        if ($notesUrl === '' && preg_match('#^https://github\.com/([^/]+)/([^/]+)/releases/(?:download/[^/]+|latest/download)/manifest\.json$#', $manifestUrl, $m) === 1) {
            $owner = $m[1];
            $repo = $m[2];
            $manifest['notes_url'] = 'https://github.com/'.$owner.'/'.$repo.'/releases/tag/v'.$versionNoV;
        }

        return $manifest;
    }

    private static function githubApiUrlFromFeedUrl(string $url): ?string
    {
        $parts = parse_url($url);
        if (!is_array($parts)) {
            return null;
        }
        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($host !== 'github.com' && $host !== 'www.github.com') {
            return null;
        }
        $path = trim((string) ($parts['path'] ?? ''), '/');
        if ($path === '') {
            return null;
        }
        $segments = array_values(array_filter(explode('/', $path), static fn (string $v): bool => $v !== ''));
        if (count($segments) < 4) {
            return null;
        }
        [$owner, $repo, $section, $sub] = array_slice($segments, 0, 4);
        if ($section !== 'releases') {
            return null;
        }
        if ($sub !== 'latest' && $sub !== 'download') {
            return null;
        }

        return 'https://api.github.com/repos/'.$owner.'/'.$repo.'/releases/latest';
    }
}
