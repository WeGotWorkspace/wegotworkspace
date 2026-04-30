<?php

declare(strict_types=1);

namespace App\Api;

use App\Admin\AdminPolicy;
use App\Admin\AuthService;
use App\Auth\LoginThrottle;

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
        $kid = ApiJwtConfig::readKid($token);
        if ($kid === null) {
            return null;
        }
        $jwtCfg = ApiJwtConfig::verificationConfigForKid($kid);
        if ($jwtCfg === null) {
            return null;
        }
        $claims = ApiToken::validate($token, $jwtCfg);
        if ($claims === null) {
            return null;
        }
        if (ApiRevocationStore::isRevoked($claims['jti'])) {
            return null;
        }

        return [
            'username' => $claims['sub'],
            'role' => $claims['role'],
        ];
    }

    /**
     * @return array{access_token: string, refresh_token: string, token_type: string, expires_in: int, role: 'user'|'admin', username: string}
     */
    public static function issueTokenFromCredentials(\PDO $pdo, string $realm, string $username, string $password, string $ip): array
    {
        $username = strtolower(trim($username));
        if ($username === '' || $password === '') {
            throw new \InvalidArgumentException('Username and password are required.');
        }
        if (!LoginThrottle::allowAndRecord($ip, $username)) {
            throw new \UnexpectedValueException('Too many login attempts. Please try again later.');
        }

        $jwtCfg = ApiJwtConfig::load();
        if ($jwtCfg === null) {
            throw new \RuntimeException('JWT key configuration missing. Configure WGW_API_JWT_PRIVATE_KEY(_PATH) and WGW_API_JWT_PUBLIC_KEY(_PATH).');
        }
        if (!AuthService::validateWithPdo($pdo, $username, $password, $realm)) {
            throw new \UnexpectedValueException('Invalid credentials.');
        }
        LoginThrottle::clearUserIp($ip, $username);
        $role = AdminPolicy::isAdmin($pdo, $username) ? 'admin' : 'user';
        $ttl = 3600;
        $token = ApiToken::issue([
            'sub' => $username,
            'role' => $role,
            'exp' => time() + $ttl,
        ], $jwtCfg);
        $refresh = ApiRefreshStore::issue($username, $role);

        return [
            'access_token' => $token,
            'refresh_token' => $refresh,
            'token_type' => 'Bearer',
            'expires_in' => $ttl,
            'role' => $role,
            'username' => $username,
        ];
    }

    /**
     * @param array{username: string, role: 'guest'|'user'|'admin'} $principal
     */
    public static function revokeCurrentAccessToken(string $token, array $principal): void
    {
        $kid = ApiJwtConfig::readKid($token);
        if ($kid === null) {
            return;
        }
        $cfg = ApiJwtConfig::verificationConfigForKid($kid);
        if ($cfg === null) {
            return;
        }
        $claims = ApiToken::validate($token, $cfg);
        if ($claims === null) {
            return;
        }
        if ($claims['sub'] !== $principal['username']) {
            return;
        }
        ApiRevocationStore::revoke($claims['jti'], $claims['exp']);
    }

    /**
     * @return array{access_token: string, refresh_token: string, token_type: string, expires_in: int, role: 'guest'|'user'|'admin', username: string}
     */
    public static function refresh(string $refreshToken): array
    {
        $principal = ApiRefreshStore::consume($refreshToken);
        if ($principal === null) {
            throw new \UnexpectedValueException('Invalid refresh token.');
        }
        $jwtCfg = ApiJwtConfig::load();
        if ($jwtCfg === null) {
            throw new \RuntimeException('JWT key configuration missing.');
        }
        $ttl = 3600;
        $access = ApiToken::issue([
            'sub' => $principal['username'],
            'role' => $principal['role'],
            'exp' => time() + $ttl,
        ], $jwtCfg);
        $newRefresh = ApiRefreshStore::issue($principal['username'], $principal['role']);

        return [
            'access_token' => $access,
            'refresh_token' => $newRefresh,
            'token_type' => 'Bearer',
            'expires_in' => $ttl,
            'role' => $principal['role'],
            'username' => $principal['username'],
        ];
    }

    public static function revokeRefreshToken(string $refreshToken): void
    {
        ApiRefreshStore::revoke($refreshToken);
    }
}
