<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;

final class ApiJwtConfig
{
    /**
     * @return array{
     *   privateKey: string,
     *   publicKey: string,
     *   issuer: string,
     *   audience: string,
     *   kid: string
     * }|null
     */
    public static function load(): ?array
    {
        $issuer = self::value('WGW_API_JWT_ISSUER', 'WGW_API_JWT_ISSUER', 'wegotworkspace-api');
        $audience = self::value('WGW_API_JWT_AUDIENCE', 'WGW_API_JWT_AUDIENCE', 'wegotworkspace-clients');
        $kid = self::value('WGW_API_JWT_KID', 'WGW_API_JWT_KID', 'wgw-rs256-v1');

        $privateKey = self::keyValue(
            'WGW_API_JWT_PRIVATE_KEY',
            'WGW_API_JWT_PRIVATE_KEY',
            'WGW_API_JWT_PRIVATE_KEY_PATH',
            'WGW_API_JWT_PRIVATE_KEY_PATH',
            'wgw-content/keys/api-jwt-private.pem'
        );
        $publicKey = self::keyValue(
            'WGW_API_JWT_PUBLIC_KEY',
            'WGW_API_JWT_PUBLIC_KEY',
            'WGW_API_JWT_PUBLIC_KEY_PATH',
            'WGW_API_JWT_PUBLIC_KEY_PATH',
            'wgw-content/keys/api-jwt-public.pem'
        );

        if ($privateKey === null || $publicKey === null) {
            return null;
        }

        return [
            'privateKey' => $privateKey,
            'publicKey' => $publicKey,
            'issuer' => $issuer,
            'audience' => $audience,
            'kid' => $kid,
        ];
    }

    /**
     * @return list<array{
     *   privateKey: string,
     *   publicKey: string,
     *   issuer: string,
     *   audience: string,
     *   kid: string
     * }>
     */
    public static function verificationConfigs(): array
    {
        $active = self::load();
        if ($active === null) {
            return [];
        }
        $items = [$active];

        $prevKid = self::value('WGW_API_JWT_PREVIOUS_KID', 'WGW_API_JWT_PREVIOUS_KID', '');
        if ($prevKid === '') {
            return $items;
        }
        $prevPublic = self::keyValue(
            'WGW_API_JWT_PREVIOUS_PUBLIC_KEY',
            'WGW_API_JWT_PREVIOUS_PUBLIC_KEY',
            'WGW_API_JWT_PREVIOUS_PUBLIC_KEY_PATH',
            'WGW_API_JWT_PREVIOUS_PUBLIC_KEY_PATH',
            ''
        );
        if ($prevPublic === null) {
            return $items;
        }
        $items[] = [
            // Not used for verification path; kept for uniform shape.
            'privateKey' => $prevPublic,
            'publicKey' => $prevPublic,
            'issuer' => $active['issuer'],
            'audience' => $active['audience'],
            'kid' => $prevKid,
        ];

        return $items;
    }

    /**
     * @return array{
     *   privateKey: string,
     *   publicKey: string,
     *   issuer: string,
     *   audience: string,
     *   kid: string
     * }|null
     */
    public static function verificationConfigForKid(string $kid): ?array
    {
        foreach (self::verificationConfigs() as $cfg) {
            if ($cfg['kid'] === $kid) {
                return $cfg;
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function jwks(): array
    {
        $out = [];
        foreach (self::verificationConfigs() as $cfg) {
            $jwk = self::jwk($cfg);
            if ($jwk !== null) {
                $out[] = $jwk;
            }
        }

        return $out;
    }

    public static function issuer(): string
    {
        return self::value('WGW_API_JWT_ISSUER', 'WGW_API_JWT_ISSUER', 'wegotworkspace-api');
    }

    public static function audience(): string
    {
        return self::value('WGW_API_JWT_AUDIENCE', 'WGW_API_JWT_AUDIENCE', 'wegotworkspace-clients');
    }

    /**
     * @return non-empty-string|null
     */
    public static function readKid(string $token): ?string
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        $head = self::decodeJwtPart((string) $parts[0]);
        if (!is_array($head)) {
            return null;
        }
        $kid = isset($head['kid']) && is_string($head['kid']) ? trim($head['kid']) : '';

        return $kid !== '' ? $kid : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function decodeJwtPart(string $part): ?array
    {
        $raw = self::b64UrlDecode($part);
        if ($raw === null) {
            return null;
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array{publicKey: string, kid: string} $cfg
     *
     * @return array<string, mixed>|null
     */
    public static function jwk(array $cfg): ?array
    {
        $public = openssl_pkey_get_public($cfg['publicKey']);
        if ($public === false) {
            return null;
        }
        $details = openssl_pkey_get_details($public);
        if (!is_array($details) || ($details['type'] ?? null) !== OPENSSL_KEYTYPE_RSA) {
            return null;
        }
        if (!isset($details['rsa']) || !is_array($details['rsa'])) {
            return null;
        }
        $rsa = $details['rsa'];
        if (!isset($rsa['n'], $rsa['e']) || !is_string($rsa['n']) || !is_string($rsa['e'])) {
            return null;
        }

        return [
            'kty' => 'RSA',
            'use' => 'sig',
            'alg' => 'RS256',
            'kid' => $cfg['kid'],
            'n' => self::b64Url($rsa['n']),
            'e' => self::b64Url($rsa['e']),
        ];
    }

    private static function value(string $envName, string $constName, string $default): string
    {
        $env = trim((string) getenv($envName));
        if ($env !== '') {
            return $env;
        }
        if (defined($constName) && is_string(constant($constName))) {
            $const = trim((string) constant($constName));
            if ($const !== '') {
                return $const;
            }
        }

        return $default;
    }

    private static function keyValue(
        string $envRaw,
        string $constRaw,
        string $envPath,
        string $constPath,
        string $defaultRelativePath
    ): ?string {
        $raw = trim((string) getenv($envRaw));
        if ($raw === '' && defined($constRaw) && is_string(constant($constRaw))) {
            $raw = trim((string) constant($constRaw));
        }
        if ($raw !== '') {
            return str_replace('\\n', "\n", $raw);
        }

        $path = trim((string) getenv($envPath));
        if ($path === '' && defined($constPath) && is_string(constant($constPath))) {
            $path = trim((string) constant($constPath));
        }
        if ($path === '') {
            if ($defaultRelativePath === '') {
                return null;
            }
            $path = $defaultRelativePath;
        }

        if (!Paths::isAbsoluteFilesystemPath($path)) {
            $path = Paths::resolveProjectPath($path);
        }
        if (!is_readable($path)) {
            return null;
        }
        $contents = file_get_contents($path);
        if (!is_string($contents)) {
            return null;
        }
        $contents = trim($contents);
        if ($contents === '') {
            return null;
        }

        return $contents;
    }

    private static function b64Url(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private static function b64UrlDecode(string $value): ?string
    {
        $padding = strlen($value) % 4;
        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return is_string($decoded) ? $decoded : null;
    }
}
