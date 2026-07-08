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

    public function test_jmap_rest_operations_document_error_responses(): void
    {
        $missing = [];

        foreach (OpenApiContract::jmapRestOperations() as $operation) {
            $key = $operation['method'].' '.$operation['path'];
            $responses = $operation['responses'];

            if (! isset($responses['403'])) {
                $missing[] = $key.' missing 403';
            } elseif (! $this->responseDocumentsErrorSchema($responses['403'])) {
                $missing[] = $key.' 403 missing Error schema';
            }

            if (in_array($operation['method'], ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                if (! isset($responses['400'])) {
                    $missing[] = $key.' missing 400';
                } elseif (! $this->responseDocumentsErrorSchema($responses['400'])) {
                    $missing[] = $key.' 400 missing Error schema';
                }
            }

            if (str_contains($operation['path'], '{') && in_array($operation['method'], ['GET', 'PUT', 'PATCH', 'DELETE'], true)) {
                if (! isset($responses['404'])) {
                    $missing[] = $key.' missing 404';
                } elseif (! $this->responseDocumentsErrorSchema($responses['404'])) {
                    $missing[] = $key.' 404 missing Error schema';
                }
            }
        }

        $this->assertSame([], $missing, "JMAP REST error contract gaps:\n".implode("\n", $missing));
    }

    private function responseDocumentsErrorSchema(mixed $response): bool
    {
        if (! is_array($response)) {
            return false;
        }

        if (isset($response['$ref']) && is_string($response['$ref'])) {
            return str_contains($response['$ref'], 'Error')
                || str_contains($response['$ref'], 'Forbidden')
                || str_contains($response['$ref'], 'BadRequest')
                || str_contains($response['$ref'], 'NotFound')
                || str_contains($response['$ref'], 'PayloadTooLarge')
                || str_contains($response['$ref'], 'PreconditionFailed');
        }

        $schema = $response['content']['application/json']['schema']['$ref'] ?? null;

        return is_string($schema) && str_ends_with($schema, '/Error');
    }
}
