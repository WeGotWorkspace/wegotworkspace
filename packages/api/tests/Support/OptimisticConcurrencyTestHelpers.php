<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Testing\TestResponse;

/**
 * Helpers for JMAP REST optimistic concurrency (If-Match / ETag).
 */
trait OptimisticConcurrencyTestHelpers
{
    protected function fetchEtagFromGet(string $url): string
    {
        $response = $this->withBearer($this->userBearerToken())->getJson($url);
        $response->assertOk();
        $etag = $response->headers->get('ETag') ?? $response->json('etag');
        $this->assertNotEmpty($etag);

        return (string) $etag;
    }

    /**
     * @return array<string, string>
     */
    protected function withIfMatch(string $etag): array
    {
        return ['If-Match' => $etag];
    }

    /**
     * @return array<string, string>
     */
    protected function ifMatchFromResponse(TestResponse $response): array
    {
        $etag = $response->headers->get('ETag') ?? $response->json('etag');
        $this->assertNotEmpty($etag);

        return $this->withIfMatch((string) $etag);
    }
}
