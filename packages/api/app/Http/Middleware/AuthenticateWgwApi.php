<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiHttpException;
use App\Services\Auth\BearerAuthenticationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateWgwApi
{
    public const PRINCIPAL_ATTRIBUTE = 'wgw.principal';

    public function __construct(private BearerAuthenticationService $bearerAuth) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $principal = $this->bearerAuth->authenticate($request->header('Authorization'));
        if ($principal === null) {
            throw new ApiHttpException(401, 'Missing or invalid bearer token.', 'unauthorized');
        }
        $request->attributes->set(self::PRINCIPAL_ATTRIBUTE, $principal);

        return $next($request);
    }
}
