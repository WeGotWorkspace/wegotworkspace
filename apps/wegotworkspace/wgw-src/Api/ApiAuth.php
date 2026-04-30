<?php

declare(strict_types=1);

namespace App\Api;

use App\Admin\AdminPolicy;
use App\Admin\AuthService;

final class ApiAuth
{
    /**
     * @return array{username: string, role: 'guest'|'user'|'admin'}|null
     */
    public static function authenticateBearer(): ?array
    {
        $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (!preg_match('/^Bearer\\s+(.+)$/i', $header, $m)) {
            return null;
        }
        $token = trim((string) ($m[1] ?? ''));
        if ($token === '') {
            return null;
        }
        $jwtCfg = ApiJwtConfig::load();
        if ($jwtCfg === null) {
            return null;
        }
        $claims = ApiToken::validate($token, $jwtCfg);
        if ($claims === null) {
            return null;
        }

        return [
            'username' => $claims['sub'],
            'role' => $claims['role'],
        ];
    }

    /**
     * @return array{access_token: string, token_type: string, expires_in: int, role: 'user'|'admin', username: string}
     */
    public static function issueTokenFromCredentials(\PDO $pdo, string $realm, string $username, string $password): array
    {
        $username = strtolower(trim($username));
        if ($username === '' || $password === '') {
            throw new \InvalidArgumentException('Username and password are required.');
        }

        $jwtCfg = ApiJwtConfig::load();
        if ($jwtCfg === null) {
            throw new \RuntimeException('JWT key configuration missing. Configure WGW_API_JWT_PRIVATE_KEY(_PATH) and WGW_API_JWT_PUBLIC_KEY(_PATH).');
        }
        if (!AuthService::validateWithPdo($pdo, $username, $password, $realm)) {
            throw new \UnexpectedValueException('Invalid credentials.');
        }
        $role = AdminPolicy::isAdmin($pdo, $username) ? 'admin' : 'user';
        $ttl = 3600;
        $token = ApiToken::issue([
            'sub' => $username,
            'role' => $role,
            'exp' => time() + $ttl,
        ], $jwtCfg);

        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => $ttl,
            'role' => $role,
            'username' => $username,
        ];
    }
}
