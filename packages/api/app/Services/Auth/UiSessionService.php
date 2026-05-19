<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Services\Installer\InstallerWebBase;
use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\Storage;

/**
 * Signed HttpOnly browser session cookie for UI shells (office, drive HTML).
 */
final class UiSessionService
{
    private const COOKIE = 'sabre_ui_auth';

    private const COOKIE_VERSION = 1;

    private const TTL_SEC = 2592000;

    public function __construct(private WgwInstallConfig $install)
    {
    }

    public function establish(string $username, string $realm, string $webBase): void
    {
        $this->ensureSecretFile();
        $this->issueCookie(strtolower(trim($username)), $realm, $this->cookiePath($webBase));
    }

    private function ensureSecretFile(): void
    {
        $disk = Storage::disk('wgw_data');
        if ($disk->exists('.ui-auth-secret')) {
            return;
        }
        $disk->put('.ui-auth-secret', random_bytes(32));
    }

    /**
     * @param non-empty-string $username
     */
    private function issueCookie(string $username, string $realm, string $path): void
    {
        $secret = $this->readSecret();
        if ($secret === null) {
            throw new \RuntimeException('UI auth secret is not available.');
        }

        $payload = json_encode([
            'v' => self::COOKIE_VERSION,
            'u' => $username,
            'r' => $realm,
            'exp' => time() + self::TTL_SEC,
        ], JSON_THROW_ON_ERROR);

        $b64Payload = $this->base64UrlEncode($payload);
        $sig = hash_hmac('sha256', $b64Payload, $secret, true);
        $value = $b64Payload.'.'.$this->base64UrlEncode($sig);

        $secure = (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        setcookie(self::COOKIE, $value, [
            'expires' => time() + self::TTL_SEC,
            'path' => $path === '' ? '/' : $path,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private function cookiePath(string $webBase): string
    {
        $path = rtrim(InstallerWebBase::url($webBase, '/'), '/');

        return $path === '' ? '/' : $path;
    }

    private function readSecret(): ?string
    {
        $disk = Storage::disk('wgw_data');
        if (! $disk->exists('.ui-auth-secret')) {
            return null;
        }
        $raw = $disk->get('.ui-auth-secret');

        return $raw !== '' ? $raw : null;
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
