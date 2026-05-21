<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Requests\Api\V1\AuthRefreshRequest;
use App\Http\Resources\Api\V1\AuthTokenResource;
use App\Services\Auth\AuthTokenService;
use Illuminate\Http\JsonResponse;

final class RefreshController
{
    public function __construct(private AuthTokenService $authTokens) {}

    public function __invoke(AuthRefreshRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $payload = $this->authTokens->refresh((string) $validated['refresh_token']);

        return (new AuthTokenResource($payload))->response();
    }
}
