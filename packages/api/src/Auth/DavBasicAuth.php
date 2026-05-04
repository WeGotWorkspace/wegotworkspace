<?php

declare(strict_types=1);

namespace App\Auth;

use App\Admin\AuthService;
use Sabre\HTTP\Auth\Basic;
use Sabre\HTTP\Response;
use Sabre\HTTP\Sapi;

/**
 * Shared HTTP Basic auth helper for DAV-backed browser and API endpoints.
 */
final class DavBasicAuth
{
    /**
     * If the request carries {@code Authorization: Basic}, validates it and returns the username, or sends 401 and
     * exits when credentials are wrong. Returns {@code null} when no Basic credentials are present.
     */
    public static function consumeBasicIfPresent(\PDO $pdo, string $realm): ?string
    {
        $request = Sapi::getRequest();
        $response = new Response();

        $basic = new Basic($realm, $request, $response);
        $creds = $basic->getCredentials();
        if ($creds === null) {
            return null;
        }

        $username = strtolower(trim((string) $creds[0]));
        $password = (string) $creds[1];

        if (!AuthService::validateWithPdo($pdo, $username, $password, $realm)) {
            $basic->requireLogin();
            Sapi::sendResponse($response);
            exit;
        }

        return $username;
    }

    /**
     * Validates {@code Authorization: Basic}, or sends 401 and exits.
     */
    public static function requireDavUser(\PDO $pdo, string $realm): string
    {
        $u = self::consumeBasicIfPresent($pdo, $realm);
        if ($u !== null) {
            return $u;
        }

        $request = Sapi::getRequest();
        $response = new Response();
        $basic = new Basic($realm, $request, $response);
        $basic->requireLogin();
        Sapi::sendResponse($response);
        exit;
    }
}
