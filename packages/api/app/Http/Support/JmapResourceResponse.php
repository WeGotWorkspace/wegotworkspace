<?php

declare(strict_types=1);

namespace App\Http\Support;

use Illuminate\Http\JsonResponse;

final class JmapResourceResponse
{
    /**
     * @param  array<string, mixed>  $data
     */
    public static function json(array $data, int $status = 200, ?string $rawEtag = null): JsonResponse
    {
        $response = response()->json($data, $status);
        $etag = OptimisticConcurrency::formatEtag($rawEtag ?? self::etagFromBody($data));
        if ($etag !== null) {
            $response->headers->set('ETag', $etag);
        }

        return $response;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function etagFromBody(array $data): ?string
    {
        $etag = $data['etag'] ?? null;

        return is_string($etag) && $etag !== '' ? $etag : null;
    }
}
