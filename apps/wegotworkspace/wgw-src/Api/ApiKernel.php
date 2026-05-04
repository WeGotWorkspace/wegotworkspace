<?php

declare(strict_types=1);

namespace App\Api;

use App\Config;
use App\Installer\WebBase;
use App\SabreUiAuthGate;

final class ApiKernel
{
    public static function tryRespond(string $webBase, string $path): bool
    {
        $docsPrefix = WebBase::url($webBase, '/api/docs');
        $openApiJsonPath = WebBase::url($webBase, '/api/openapi.json');

        if ($path === $docsPrefix) {
            self::redirectTo($docsPrefix.'/');

            return true;
        }

        if ($path === $docsPrefix || $path === $docsPrefix.'/') {
            self::respondSwaggerUi($webBase);

            return true;
        }
        if ($path === $docsPrefix.'/swagger-ui.css') {
            self::respondSwaggerAsset('swagger-ui.css', 'text/css; charset=utf-8');

            return true;
        }
        if ($path === $docsPrefix.'/swagger-ui-bundle.js') {
            self::respondSwaggerAsset('swagger-ui-bundle.js', 'application/javascript; charset=utf-8');

            return true;
        }
        if ($path === $docsPrefix.'/swagger-ui-standalone-preset.js') {
            self::respondSwaggerAsset('swagger-ui-standalone-preset.js', 'application/javascript; charset=utf-8');

            return true;
        }
        if ($path === $docsPrefix.'/favicon-32x32.png') {
            self::respondSwaggerAsset('favicon-32x32.png', 'image/png');

            return true;
        }
        if ($path === $docsPrefix.'/favicon-16x16.png') {
            self::respondSwaggerAsset('favicon-16x16.png', 'image/png');

            return true;
        }

        if ($path === $openApiJsonPath) {
            ApiResponse::json(200, OpenApiDocument::build($webBase));

            return true;
        }
        $jwksPath = WebBase::url($webBase, '/api/v1/.well-known/jwks.json');
        if ($path === $jwksPath) {
            $jwks = ApiJwtConfig::jwks();
            if ($jwks === []) {
                ApiResponse::error(503, 'JWT key configuration is missing.');

                return true;
            }
            ApiResponse::json(200, ['keys' => $jwks]);

            return true;
        }

        $apiPrefix = WebBase::url($webBase, '/api/v1');
        if ($path !== $apiPrefix && !str_starts_with($path, $apiPrefix.'/')) {
            return false;
        }

        $method = ApiRequest::method();
        $rel = $path === $apiPrefix ? '' : substr($path, strlen($apiPrefix) + 1);
        $rel = trim((string) $rel, '/');

        if ($method === 'GET' && $rel === 'health') {
            ApiResponse::json(200, [
                'status' => 'ok',
                'apiVersion' => 'v1',
                'timestamp' => gmdate(DATE_ATOM),
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'capabilities') {
            ApiResponse::json(200, [
                'apiVersion' => 'v1',
                'auth' => [
                    'type' => 'bearer-jwt-rs256',
                    'tokenEndpoint' => WebBase::url($webBase, '/api/v1/auth/token'),
                    'refreshEndpoint' => WebBase::url($webBase, '/api/v1/auth/refresh'),
                    'revokeEndpoint' => WebBase::url($webBase, '/api/v1/auth/revoke'),
                    'jwksEndpoint' => WebBase::url($webBase, '/api/v1/.well-known/jwks.json'),
                ],
                'domains' => self::domainCapabilities(),
            ]);

            return true;
        }

        if ($method === 'POST' && $rel === 'auth/token') {
            try {
                [$pdo, $realm] = self::dbAndRealm();
                $body = ApiRequest::jsonBody();
                $username = (string) ($body['username'] ?? '');
                $password = (string) ($body['password'] ?? '');
                $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
                ApiResponse::json(200, ApiAuth::issueTokenFromCredentials($pdo, $realm, $username, $password, $ip));
            } catch (\InvalidArgumentException $e) {
                ApiResponse::error(400, $e->getMessage(), 'bad_request');
            } catch (\UnexpectedValueException $e) {
                $msg = $e->getMessage();
                if (str_contains(strtolower($msg), 'too many login attempts')) {
                    ApiResponse::error(429, $msg, 'throttled');
                } else {
                    ApiResponse::error(401, $msg, 'unauthorized');
                }
            } catch (\RuntimeException $e) {
                ApiResponse::error(503, $e->getMessage(), 'config_error');
            } catch (\Throwable) {
                ApiResponse::error(500, 'Could not issue token.', 'server_error');
            }

            return true;
        }
        if ($method === 'POST' && $rel === 'auth/session') {
            try {
                [$pdo, $realm] = self::dbAndRealm();
                $username = SabreUiAuthGate::validatedUsername($realm);
                if ($username === null || $username === '') {
                    ApiResponse::error(401, 'Missing or invalid browser session.', 'unauthorized');

                    return true;
                }
                ApiResponse::json(200, ApiAuth::issueTokenForPrincipal($pdo, $username));
            } catch (\InvalidArgumentException $e) {
                ApiResponse::error(400, $e->getMessage(), 'bad_request');
            } catch (\RuntimeException $e) {
                ApiResponse::error(503, $e->getMessage(), 'config_error');
            } catch (\Throwable) {
                ApiResponse::error(500, 'Could not issue session token.', 'server_error');
            }

            return true;
        }
        if ($method === 'POST' && $rel === 'auth/refresh') {
            try {
                [$pdo] = self::dbAndRealm();
                $body = ApiRequest::jsonBody();
                $refreshToken = (string) ($body['refresh_token'] ?? '');
                if ($refreshToken === '') {
                    throw new \InvalidArgumentException('refresh_token is required.');
                }
                ApiResponse::json(200, ApiAuth::refresh($pdo, $refreshToken));
            } catch (\InvalidArgumentException $e) {
                ApiResponse::error(400, $e->getMessage(), 'bad_request');
            } catch (\UnexpectedValueException $e) {
                ApiResponse::error(401, $e->getMessage(), 'unauthorized');
            } catch (\RuntimeException $e) {
                ApiResponse::error(503, $e->getMessage(), 'config_error');
            } catch (\Throwable) {
                ApiResponse::error(500, 'Could not refresh token.', 'server_error');
            }

            return true;
        }
        if ($method === 'POST' && $rel === 'auth/revoke') {
            try {
                [$pdo] = self::dbAndRealm();
                $body = ApiRequest::jsonBody();
                $principal = ApiAuth::authenticateBearer($pdo);
                if ($principal !== null) {
                    $bearer = self::bearerTokenFromHeader();
                    if ($bearer !== null) {
                        ApiAuth::revokeCurrentAccessToken($pdo, $bearer, $principal);
                    }
                }
                if (isset($body['refresh_token']) && is_string($body['refresh_token']) && $body['refresh_token'] !== '') {
                    ApiAuth::revokeRefreshToken($pdo, $body['refresh_token']);
                }
                ApiResponse::json(200, ['ok' => true]);
            } catch (\InvalidArgumentException $e) {
                ApiResponse::error(400, $e->getMessage(), 'bad_request');
            } catch (\Throwable) {
                ApiResponse::error(500, 'Could not revoke token.', 'server_error');
            }

            return true;
        }

        try {
            [$pdo, $realm] = self::dbAndRealm();
        } catch (\Throwable) {
            ApiResponse::error(503, 'Could not load API configuration.', 'config_error');

            return true;
        }
        $principal = ApiAuth::authenticateBearer($pdo);
        if ($method === 'GET' && $rel === 'me') {
            if ($principal === null) {
                ApiResponse::error(401, 'Missing or invalid bearer token.', 'unauthorized');

                return true;
            }
            ApiResponse::json(200, [
                'username' => $principal['username'],
                'role' => $principal['role'],
            ]);

            return true;
        }

        try {
            if (ApiDomainHandlers::dispatch($webBase, $method, $rel, $principal, $pdo, $realm)) {
                return true;
            }
        } catch (\InvalidArgumentException $e) {
            ApiResponse::error(400, $e->getMessage(), 'bad_request');

            return true;
        } catch (\Throwable) {
            ApiResponse::error(500, 'API domain handler error.', 'server_error');

            return true;
        }

        ApiResponse::error(404, 'Not found', 'not_found');

        return true;
    }

    private static function respondSwaggerUi(string $webBase): void
    {
        $specUrl = WebBase::url($webBase, '/api/openapi.json');

        http_response_code(200);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
        echo '<title>WeGotWorkspace API Docs</title>';
        echo '<link rel="icon" type="image/png" href="'.htmlspecialchars(WebBase::url($webBase, '/api/docs/favicon-32x32.png'), ENT_QUOTES, 'UTF-8').'">';
        echo '<link rel="stylesheet" href="'.htmlspecialchars(WebBase::url($webBase, '/api/docs/swagger-ui.css'), ENT_QUOTES, 'UTF-8').'">';
        echo '</head><body><div id="swagger-ui"></div>';
        echo '<script src="'.htmlspecialchars(WebBase::url($webBase, '/api/docs/swagger-ui-bundle.js'), ENT_QUOTES, 'UTF-8').'"></script>';
        echo '<script src="'.htmlspecialchars(WebBase::url($webBase, '/api/docs/swagger-ui-standalone-preset.js'), ENT_QUOTES, 'UTF-8').'"></script>';
        echo '<script>window.ui=SwaggerUIBundle({url:"'.htmlspecialchars($specUrl, ENT_QUOTES, 'UTF-8').'",dom_id:"#swagger-ui",presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:"BaseLayout"});</script>';
        echo '</body></html>';
    }

    /**
     * @return array<int, array{name: string, requiredRole: string}>
     */
    private static function domainCapabilities(): array
    {
        $caps = [];
        foreach (self::domainMap() as $domain => $requiredRole) {
            $caps[] = [
                'name' => $domain,
                'requiredRole' => $requiredRole,
            ];
        }

        return $caps;
    }

    /**
     * @return array<string, 'guest'|'user'|'admin'>
     */
    private static function domainMap(): array
    {
        return [
            'admin' => 'admin',
            'settings' => 'user',
            'mail' => 'user',
            'drive' => 'user',
            'notes' => 'user',
            'office' => 'user',
            'voice' => 'guest',
            'installer' => 'guest',
            'home' => 'guest',
            'dav' => 'user',
        ];
    }

    public static function roleAllows(string $actual, string $required): bool
    {
        $rank = ['guest' => 1, 'user' => 2, 'admin' => 3];

        return ($rank[$actual] ?? 0) >= ($rank[$required] ?? 0);
    }

    /**
     * @return array{0: \PDO, 1: string}
     */
    private static function dbAndRealm(): array
    {
        $cfg = Config::load();
        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $realm = (string) ($cfg['auth_realm'] ?? 'SabreDAV');

        return [$pdo, $realm];
    }

    private static function redirectTo(string $location): void
    {
        header('Location: '.$location, true, 302);
    }

    private static function respondSwaggerAsset(string $file, string $contentType): void
    {
        $path = dirname(__DIR__, 2).'/vendor/swagger-api/swagger-ui/dist/'.$file;
        if (!is_readable($path)) {
            ApiResponse::error(503, 'Swagger UI asset is missing.', 'docs_unavailable');

            return;
        }
        $bytes = file_get_contents($path);
        if (!is_string($bytes)) {
            ApiResponse::error(503, 'Swagger UI asset could not be read.', 'docs_unavailable');

            return;
        }
        http_response_code(200);
        header('Content-Type: '.$contentType);
        header('Cache-Control: public, max-age=300');
        echo $bytes;
    }

    /**
     * @return non-empty-string|null
     */
    private static function bearerTokenFromHeader(): ?string
    {
        $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (!preg_match('/^Bearer\\s+(.+)$/i', $header, $m)) {
            return null;
        }
        $token = trim((string) ($m[1] ?? ''));

        return $token !== '' ? $token : null;
    }
}
