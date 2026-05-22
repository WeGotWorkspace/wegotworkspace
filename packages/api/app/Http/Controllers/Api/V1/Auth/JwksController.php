<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Services\Auth\JwtConfigService;
use Illuminate\Http\JsonResponse;

final class JwksController
{
    public function __construct(private JwtConfigService $jwtConfig) {}

    public function __invoke(): JsonResponse
    {
        $keys = $this->jwtConfig->jwks();
        if ($keys === []) {
            return response()->json(['error' => 'JWT not configured.'], 503);
        }

        return response()->json(['keys' => $keys]);
    }
}
