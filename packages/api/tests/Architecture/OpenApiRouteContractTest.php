<?php

declare(strict_types=1);

namespace Tests\Architecture;

use Tests\Support\OpenApiContract;
use Tests\TestCase;

/**
 * Bidirectional contract: routes/api.php ↔ openapi/openapi.json for /api/v1/*.
 */
final class OpenApiRouteContractTest extends TestCase
{
    public function test_api_routes_are_declared_in_openapi(): void
    {
        $paths = OpenApiContract::paths();
        $missing = [];

        foreach (OpenApiContract::registeredApiOperations() as $operation) {
            [$method, $openApiPath] = explode(' ', $operation, 2);
            $pathItem = $paths[$openApiPath] ?? null;
            if (! is_array($pathItem)) {
                $missing[] = $openApiPath.' (no path in OpenAPI)';

                continue;
            }
            $op = strtolower($method);
            if (! isset($pathItem[$op])) {
                $missing[] = $openApiPath.' '.$method;
            }
        }

        $this->assertSame(
            [],
            $missing,
            "Laravel routes missing from openapi/openapi.json:\n".implode("\n", $missing)
        );
    }

    public function test_openapi_operations_have_laravel_routes(): void
    {
        $registered = array_fill_keys(OpenApiContract::registeredApiOperations(), true);
        $missing = [];

        foreach (OpenApiContract::documentedApiOperations() as $operation) {
            if (! isset($registered[$operation])) {
                $missing[] = $operation;
            }
        }

        $this->assertSame(
            [],
            $missing,
            "OpenAPI operations missing from routes/api.php:\n".implode("\n", $missing)
        );
    }
}
