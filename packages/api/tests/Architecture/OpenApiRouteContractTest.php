<?php

declare(strict_types=1);

namespace Tests\Architecture;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Every registered /api/v1 route must be declared in openapi/openapi.json.
 */
final class OpenApiRouteContractTest extends TestCase
{
    public function test_api_routes_are_declared_in_openapi(): void
    {
        $specPath = dirname(__DIR__, 2).'/openapi/openapi.json';
        $this->assertFileExists($specPath);
        $spec = json_decode((string) file_get_contents($specPath), true);
        $this->assertIsArray($spec);
        /** @var array<string, mixed> $paths */
        $paths = $spec['paths'] ?? [];

        $missing = [];
        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();
            if (! str_starts_with($uri, 'api/v1/')) {
                continue;
            }
            $relative = substr($uri, strlen('api/v1'));
            $openApiPath = str_starts_with($relative, '/') ? $relative : '/'.$relative;

            $pathItem = $paths[$openApiPath] ?? null;
            if (! is_array($pathItem)) {
                $missing[] = $openApiPath.' (no path in OpenAPI)';

                continue;
            }

            foreach ($route->methods() as $method) {
                if (in_array($method, ['HEAD', 'OPTIONS'], true)) {
                    continue;
                }
                $op = strtolower($method);
                if (! isset($pathItem[$op])) {
                    $missing[] = $openApiPath.' '.$method;
                }
            }
        }

        $this->assertSame(
            [],
            $missing,
            "Laravel routes missing from openapi/openapi.json:\n".implode("\n", $missing)
        );
    }
}
