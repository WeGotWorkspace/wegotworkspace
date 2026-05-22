<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\File;

final class JwtConfigService
{
    private const KEY_DIR = 'keys';

    private const PRIVATE_KEY_FILE = 'api-jwt-private.pem';

    private const PUBLIC_KEY_FILE = 'api-jwt-public.pem';

    public function __construct(private WgwInstallConfig $install) {}

    /**
     * @return array{
     *   privateKey: string,
     *   publicKey: string,
     *   issuer: string,
     *   audience: string,
     *   kid: string
     * }|null
     */
    public function signingConfig(): ?array
    {
        $privateKey = $this->keyMaterial('private_key', 'private_key_path', $this->defaultPrivateKeyPath());
        $publicKey = $this->keyMaterial('public_key', 'public_key_path', $this->defaultPublicKeyPath());
        if ($privateKey === null || $publicKey === null) {
            return null;
        }

        return [
            'privateKey' => $privateKey,
            'publicKey' => $publicKey,
            'issuer' => (string) config('wgw.jwt.issuer'),
            'audience' => (string) config('wgw.jwt.audience'),
            'kid' => (string) config('wgw.jwt.kid'),
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
    public function verificationConfigs(): array
    {
        $active = $this->signingConfig();
        if ($active === null) {
            return [];
        }
        $items = [$active];

        $prevKid = trim((string) config('wgw.jwt.previous_kid'));
        if ($prevKid === '') {
            return $items;
        }
        $prevPublic = $this->keyMaterial('previous_public_key', 'previous_public_key_path', '');
        if ($prevPublic === null) {
            return $items;
        }
        $items[] = [
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
    public function verificationConfigForKid(string $kid): ?array
    {
        foreach ($this->verificationConfigs() as $cfg) {
            if ($cfg['kid'] === $kid) {
                return $cfg;
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function jwks(): array
    {
        $out = [];
        foreach ($this->verificationConfigs() as $cfg) {
            $jwk = $this->jwkFromPublicKey($cfg['publicKey'], $cfg['kid']);
            if ($jwk !== null) {
                $out[] = $jwk;
            }
        }

        return $out;
    }

    public function accessTtl(): int
    {
        return max(60, (int) config('wgw.jwt.access_ttl'));
    }

    /**
     * @return non-empty-string|null
     */
    public function readKid(string $token): ?string
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        $head = $this->decodeJwtPart((string) $parts[0]);
        if (! is_array($head)) {
            return null;
        }
        $kid = isset($head['kid']) && is_string($head['kid']) ? trim($head['kid']) : '';

        return $kid !== '' ? $kid : null;
    }

    private function defaultPrivateKeyPath(): string
    {
        return rtrim($this->install->dataDir(), '/').'/'.self::KEY_DIR.'/'.self::PRIVATE_KEY_FILE;
    }

    private function defaultPublicKeyPath(): string
    {
        return rtrim($this->install->dataDir(), '/').'/'.self::KEY_DIR.'/'.self::PUBLIC_KEY_FILE;
    }

    private function keyMaterial(string $rawKey, string $pathKey, string $defaultPath): ?string
    {
        $raw = trim((string) config('wgw.jwt.'.$rawKey));
        if ($raw !== '') {
            return str_replace('\\n', "\n", $raw);
        }

        $path = trim((string) config('wgw.jwt.'.$pathKey));
        if ($path === '' && $defaultPath !== '') {
            $path = $defaultPath;
        }
        if ($path === '') {
            return null;
        }

        $absolute = $this->install->resolveInstallPath($path);
        if (! is_readable($absolute)) {
            return null;
        }
        if (! File::isFile($absolute)) {
            return null;
        }
        $contents = trim(File::get($absolute));

        return $contents === '' ? null : $contents;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function jwkFromPublicKey(string $publicKey, string $kid): ?array
    {
        $public = openssl_pkey_get_public($publicKey);
        if ($public === false) {
            return null;
        }
        $details = openssl_pkey_get_details($public);
        if (! is_array($details) || ($details['type'] ?? null) !== OPENSSL_KEYTYPE_RSA) {
            return null;
        }
        if (! isset($details['rsa']) || ! is_array($details['rsa'])) {
            return null;
        }
        $rsa = $details['rsa'];
        if (! isset($rsa['n'], $rsa['e']) || ! is_string($rsa['n']) || ! is_string($rsa['e'])) {
            return null;
        }

        return [
            'kty' => 'RSA',
            'use' => 'sig',
            'alg' => 'RS256',
            'kid' => $kid,
            'n' => $this->b64Url($rsa['n']),
            'e' => $this->b64Url($rsa['e']),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeJwtPart(string $part): ?array
    {
        $padding = strlen($part) % 4;
        if ($padding > 0) {
            $part .= str_repeat('=', 4 - $padding);
        }
        $decoded = base64_decode(strtr($part, '-_', '+/'), true);
        if (! is_string($decoded)) {
            return null;
        }
        $json = json_decode($decoded, true);

        return is_array($json) ? $json : null;
    }

    private function b64Url(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
