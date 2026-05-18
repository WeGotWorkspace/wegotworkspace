<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Requests\Api\V1\AuthRevokeRequest;
use App\Services\Auth\AuthTokenService;
use App\Services\Auth\BearerAuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RevokeController
{
    public function __construct(
        private AuthTokenService $authTokens,
        private BearerAuthenticationService $bearerAuth,
    ) {
    }

    public function __invoke(AuthRevokeRequest $request): JsonResponse
    {
        $principal = $this->bearerAuth->authenticate($request->header('Authorization'));
        $refreshToken = $request->validated()['refresh_token'] ?? null;
        $bearer = $this->bearerAuth->extractBearerToken($request->header('Authorization'));

        $this->authTokens->revoke($principal, $bearer, is_string($refreshToken) ? $refreshToken : null);

        return response()->json(['ok' => true]);
    }
}
