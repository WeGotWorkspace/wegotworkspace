<?php

declare(strict_types=1);

namespace App\Voice;

use App\Admin\AuthService;
use App\SabreUiAuthGate;
use Sabre\HTTP\Auth\Basic;
use Sabre\HTTP\Response;
use Sabre\HTTP\Sapi;

/**
 * Optional Sabre HTTP Basic / UI cookie check for Voice (used when creating a room, not for public joins).
 */
final class VoiceSabreAuth
{
    /**
     * @return non-empty-string|null
     */
    public static function tryAuthenticatedUser(\PDO $pdo, string $realm): ?string
    {
        $u = SabreUiAuthGate::validatedUsername($realm);
        if ($u !== null && $u !== '') {
            return $u;
        }

        $request = Sapi::getRequest();
        $basic = new Basic($realm, $request, new Response());
        $creds = $basic->getCredentials();
        if ($creds === null) {
            return null;
        }

        $username = strtolower(trim((string) $creds[0]));
        $password = (string) $creds[1];
        if ($username === '' || !AuthService::validateWithPdo($pdo, $username, $password, $realm)) {
            return null;
        }

        return $username;
    }

    /**
     * Sends {@code 401} JSON plus {@code WWW-Authenticate} so clients can detect “create requires login”.
     */
    public static function respondJsonUnauthorized(string $realm): never
    {
        $response = new Response();
        $basic = new Basic($realm, Sapi::getRequest(), $response);
        $basic->requireLogin();
        foreach ($response->getHeaders() as $name => $values) {
            foreach ($values as $v) {
                header($name.': '.$v, false);
            }
        }
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'auth_required',
            'message' => 'Sign in with your Sabre account to start a new call.',
        ]);
        exit;
    }
}
