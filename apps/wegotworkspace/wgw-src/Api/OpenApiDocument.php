<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;

final class OpenApiDocument
{
    public static function build(string $webBase): array
    {
        $base = $webBase === '' ? '' : $webBase;
        $serverUrl = $base.'/api/v1';
        $path = Paths::appRoot().'/openapi/openapi.json';
        if (!is_readable($path)) {
            throw new \RuntimeException('OpenAPI spec file is missing.');
        }
        $raw = (string) file_get_contents($path);
        $spec = json_decode($raw, true);
        if (!is_array($spec)) {
            throw new \RuntimeException('OpenAPI spec is invalid JSON.');
        }

        return self::replaceServerUrl($spec, $serverUrl);
    }

    /**
     * @param array<string, mixed> $spec
     *
     * @return array<string, mixed>
     */
    private static function replaceServerUrl(array $spec, string $serverUrl): array
    {
        foreach ($spec as $key => $value) {
            if (is_array($value)) {
                $spec[$key] = self::replaceServerUrl($value, $serverUrl);
            } elseif (is_string($value) && $value === '__SERVER_URL__') {
                $spec[$key] = $serverUrl;
            }
        }

        return $spec;
    }
}
