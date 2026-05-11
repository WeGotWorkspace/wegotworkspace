<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;

final class ApiJwtConfig
{
    private const DEFAULT_PRIVATE_KEY_PATH = 'wgw-content/keys/api-jwt-private.pem';
    private const DEFAULT_PUBLIC_KEY_PATH = 'wgw-content/keys/api-jwt-public.pem';

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

        self::ensureDefaultKeyPairIfUnconfigured();

        $privateKey = self::keyValue(
            'WGW_API_JWT_PRIVATE_KEY',
            'WGW_API_JWT_PRIVATE_KEY',
            'WGW_API_JWT_PRIVATE_KEY_PATH',
            'WGW_API_JWT_PRIVATE_KEY_PATH',
            self::DEFAULT_PRIVATE_KEY_PATH
        );
        $publicKey = self::keyValue(
            'WGW_API_JWT_PUBLIC_KEY',
            'WGW_API_JWT_PUBLIC_KEY',
            'WGW_API_JWT_PUBLIC_KEY_PATH',
            'WGW_API_JWT_PUBLIC_KEY_PATH',
            self::DEFAULT_PUBLIC_KEY_PATH
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

    private static function ensureDefaultKeyPairIfUnconfigured(): void
    {
        if (self::isExplicitJwtKeyConfigPresent()) {
            return;
        }

        $privatePath = Paths::resolveProjectPath(self::DEFAULT_PRIVATE_KEY_PATH);
        $publicPath = Paths::resolveProjectPath(self::DEFAULT_PUBLIC_KEY_PATH);
        if (is_readable($privatePath) && is_readable($publicPath)) {
            return;
        }

        self::ensureDefaultKeyPair($privatePath, $publicPath);
    }

    private static function isExplicitJwtKeyConfigPresent(): bool
    {
        $keys = [
            'WGW_API_JWT_PRIVATE_KEY',
            'WGW_API_JWT_PRIVATE_KEY_PATH',
            'WGW_API_JWT_PUBLIC_KEY',
            'WGW_API_JWT_PUBLIC_KEY_PATH',
        ];
        foreach ($keys as $key) {
            $env = trim((string) getenv($key));
            if ($env !== '') {
                return true;
            }
            if (defined($key) && is_string(constant($key)) && trim((string) constant($key)) !== '') {
                return true;
            }
        }

        return false;
    }

    private static function ensureDefaultKeyPair(string $privatePath, string $publicPath): void
    {
        if (!function_exists('openssl_pkey_new')) {
            return;
        }

        $privateDir = dirname($privatePath);
        $publicDir = dirname($publicPath);
        if (!is_dir($privateDir)) {
            @mkdir($privateDir, 0775, true);
        }
        if (!is_dir($publicDir)) {
            @mkdir($publicDir, 0775, true);
        }

        $privatePem = is_readable($privatePath) ? trim((string) @file_get_contents($privatePath)) : '';
        $publicPem = is_readable($publicPath) ? trim((string) @file_get_contents($publicPath)) : '';

        if ($privatePem !== '' && $publicPem !== '') {
            return;
        }

        if ($privatePem !== '' && $publicPem === '') {
            $privateKey = @openssl_pkey_get_private($privatePem);
            $details = $privateKey !== false ? @openssl_pkey_get_details($privateKey) : false;
            if (is_array($details) && isset($details['key']) && is_string($details['key']) && trim($details['key']) !== '') {
                @file_put_contents($publicPath, trim($details['key']).PHP_EOL, LOCK_EX);
                @chmod($publicPath, 0644);
            }

            return;
        }

        if ($privatePem === '' && $publicPem !== '') {
            // Can't issue tokens without private key; avoid clobbering existing public key.
            return;
        }

        $keyResource = @openssl_pkey_new([
            'private_key_bits' => 4096,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        if ($keyResource === false) {
            return;
        }

        $exportedPrivate = '';
        if (@openssl_pkey_export($keyResource, $exportedPrivate) !== true || trim($exportedPrivate) === '') {
            return;
        }

        $details = @openssl_pkey_get_details($keyResource);
        if (!is_array($details) || !isset($details['key']) || !is_string($details['key']) || trim($details['key']) === '') {
            return;
        }

        @file_put_contents($privatePath, trim($exportedPrivate).PHP_EOL, LOCK_EX);
        @chmod($privatePath, 0600);
        @file_put_contents($publicPath, trim($details['key']).PHP_EOL, LOCK_EX);
        @chmod($publicPath, 0644);
    }
}
