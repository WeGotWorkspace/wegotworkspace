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
            return null;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        if (isset($decoded['version']) && is_string($decoded['version'])) {
            return $decoded;
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

            return $manifest;
        }

        return null;
    }

    private static function fetchJsonText(string $url): ?string
    {
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
}
