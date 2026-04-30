<?php

declare(strict_types=1);

namespace App\Api;

use App\Config;
use App\Installer\WebBase;

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

        if ($path === $openApiJsonPath) {
            ApiResponse::json(200, OpenApiDocument::build($webBase));

            return true;
        }
        $jwksPath = WebBase::url($webBase, '/api/v1/.well-known/jwks.json');
        if ($path === $jwksPath) {
            $jwtCfg = ApiJwtConfig::load();
            if ($jwtCfg === null) {
                ApiResponse::error(503, 'JWT key configuration is missing.');

                return true;
            }
            $jwk = ApiJwtConfig::jwk($jwtCfg);
            if ($jwk === null) {
                ApiResponse::error(503, 'JWT public key is invalid for JWKS export.');

                return true;
            }
            ApiResponse::json(200, ['keys' => [$jwk]]);

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
                ApiResponse::json(200, ApiAuth::issueTokenFromCredentials($pdo, $realm, $username, $password));
            } catch (\InvalidArgumentException $e) {
                ApiResponse::error(400, $e->getMessage(), 'bad_request');
            } catch (\UnexpectedValueException $e) {
                ApiResponse::error(401, $e->getMessage(), 'unauthorized');
            } catch (\RuntimeException $e) {
                ApiResponse::error(503, $e->getMessage(), 'config_error');
            } catch (\Throwable) {
                ApiResponse::error(500, 'Could not issue token.', 'server_error');
            }

            return true;
        }

        $principal = ApiAuth::authenticateBearer();
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

        if ($method === 'GET' && preg_match('#^([a-z0-9_-]+)/status$#', $rel, $m)) {
            $domain = (string) ($m[1] ?? '');
            $requiredRole = self::requiredRoleForDomain($domain);
            if ($requiredRole === null) {
                ApiResponse::error(404, 'Unknown domain.', 'not_found');

                return true;
            }
            if (!self::roleAllows($principal['role'] ?? 'guest', $requiredRole)) {
                if ($requiredRole !== 'guest' && $principal === null) {
                    ApiResponse::error(401, 'Missing or invalid bearer token.', 'unauthorized');
                } else {
                    ApiResponse::error(403, 'Insufficient role.', 'forbidden');
                }

                return true;
            }
            ApiResponse::json(200, [
                'domain' => $domain,
                'requiredRole' => $requiredRole,
                'status' => 'planned',
                'message' => 'Domain route scaffold is active in API v1.',
            ]);

            return true;
        }

        try {
            [$pdo, $realm] = self::dbAndRealm();
        } catch (\Throwable) {
            ApiResponse::error(503, 'Could not load API configuration.', 'config_error');

            return true;
        }
        try {
            if (ApiDomainHandlers::dispatch($webBase, $method, $rel, $principal, $pdo, $realm)) {
                return true;
            }
        } catch (\InvalidArgumentException $e) {
            ApiResponse::error(400, $e->getMessage(), 'bad_request');

            return true;
        } catch (\Throwable $e) {
            ApiResponse::error(500, 'API domain handler error: '.$e->getMessage(), 'server_error');

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
        echo '<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">';
        echo '</head><body><div id="swagger-ui"></div>';
        echo '<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>';
        echo '<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>';
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

    private static function requiredRoleForDomain(string $domain): ?string
    {
        $map = self::domainMap();

        return $map[$domain] ?? null;
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
}
