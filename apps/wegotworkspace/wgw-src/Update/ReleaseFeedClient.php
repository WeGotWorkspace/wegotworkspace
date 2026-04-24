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
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 15,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\nUser-Agent: WeGotWorkspace-Updater/1.0\r\n",
            ],
        ]);
        $raw = @file_get_contents($feedUrl, false, $ctx);
        if (!is_string($raw) || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        return $decoded;
    }
}
