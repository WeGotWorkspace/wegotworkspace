<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Facades\Route;

/**
 * Helpers for OpenAPI ↔ Laravel route parity (api-done-gate).
 */
final class OpenApiContract
{
    /** @return array<string, mixed> */
    public static function loadSpec(): array
    {
        $specPath = dirname(__DIR__, 2).'/openapi/openapi.json';
        if (! is_readable($specPath)) {
            throw new \RuntimeException('Missing openapi/openapi.json');
        }
        $spec = json_decode((string) file_get_contents($specPath), true);
        if (! is_array($spec)) {
            throw new \RuntimeException('Invalid openapi/openapi.json');
        }

        return $spec;
    }

    /**
     * @return array<string, mixed>
     */
    public static function paths(): array
    {
        $spec = self::loadSpec();
        $paths = $spec['paths'] ?? [];

        return is_array($paths) ? $paths : [];
    }

    /**
     * @return list<string> keys like "GET /health"
     */
    public static function registeredApiOperations(): array
    {
        $operations = [];
        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();
            if (! str_starts_with($uri, 'api/v1/')) {
                continue;
            }
            $relative = substr($uri, strlen('api/v1'));
            $openApiPath = str_starts_with($relative, '/') ? $relative : '/'.$relative;

            foreach ($route->methods() as $method) {
                if (in_array($method, ['HEAD', 'OPTIONS'], true)) {
                    continue;
                }
                $operations[] = strtoupper($method).' '.$openApiPath;
            }
        }

        sort($operations);

        return $operations;
    }

    /**
     * @return list<string> keys like "GET /health"
     */
    public static function documentedApiOperations(): array
    {
        $operations = [];
        foreach (self::paths() as $path => $pathItem) {
            if (! is_string($path) || ! is_array($pathItem)) {
                continue;
            }
            foreach ($pathItem as $op => $definition) {
                if (! is_string($op) || ! is_array($definition)) {
                    continue;
                }
                if (in_array(strtolower($op), ['parameters', 'summary', 'description', 'servers'], true)) {
                    continue;
                }
                $operations[] = strtoupper($op).' '.$path;
            }
        }

        sort($operations);

        return $operations;
    }
}
