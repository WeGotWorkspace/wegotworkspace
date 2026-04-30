<?php

declare(strict_types=1);

namespace App;

use App\Installer\WebBase;
use App\Paths;
use App\Auth\DavBasicAuth;

/**
 * After a successful browser sign-in ({@code /login/} form) or HTTP Basic for browser HTML shells, issues a
 * signed HttpOnly cookie scoped to the web install root ({@code /} or {@code /app}) so the browser is not forced to
 * resend Basic on every reload or XHR (many UAs handle Basic poorly for {@code fetch()}). Same realm/user store as
 * {@see \App\Auth\DavBasicAuth}. Top-level HTML navigations without a session are redirected to {@code /login/}
 * instead of triggering the browser’s native Basic dialog; APIs and DAV clients still use Basic as needed.
 */
final class SabreUiAuthGate
{
    private const COOKIE = 'sabre_ui_auth';

    /** Legacy Drive-only cookie (path {@code /drive}); still accepted if present. */
    private const COOKIE_LEGACY_DRIVE = 'sabre_drive_gate';

    private const COOKIE_VERSION = 1;

    private const TTL_SEC = 2592000; // 30 days

    /**
     * Cookie {@code Path} covering browser apps under this install.
     */
    public static function cookiePathForWebBase(string $webBase): string
    {
        $p = rtrim(WebBase::url($webBase, '/'), '/');

        return $p === '' ? '/' : $p;
    }

    /**
     * @return non-empty-string
     */
    public static function ensureAuthenticated(\PDO $pdo, string $realm, string $webBase, string $requestPath = ''): string
    {
        self::ensureSecretFile();
        $u = self::validatedUsername($realm);
        if ($u !== null) {
            return $u;
        }

        $u = DavBasicAuth::consumeBasicIfPresent($pdo, $realm);
        if ($u !== null) {
            self::issueCookie($u, $realm, self::cookiePathForWebBase($webBase));

            return $u;
        }

        $path = $requestPath !== '' ? $requestPath : (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
        if (self::shouldRedirectUnauthenticatedBrowserToLogin($path, $webBase)) {
            self::redirectToLoginForm($webBase, $path);
        }

        $u = DavBasicAuth::requireDavUser($pdo, $realm);
        self::issueCookie($u, $realm, self::cookiePathForWebBase($webBase));

        return $u;
    }

    /**
     * Sets the signed UI session cookie (same payload as after a successful Basic check).
     *
     * @param non-empty-string $username
     */
    public static function establishSession(string $username, string $realm, string $webBase): void
    {
        self::ensureSecretFile();
        self::issueCookie(strtolower(trim($username)), $realm, self::cookiePathForWebBase($webBase));
    }

    public static function clearSession(string $webBase): void
    {
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $path = self::cookiePathForWebBase($webBase);
        $path = $path === '' ? '/' : $path;
        $opts = [
            'expires' => time() - 3600,
            'path' => $path,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ];
        setcookie(self::COOKIE, '', $opts);
        $drivePath = WebBase::url($webBase, '/drive');
        $drivePath = $drivePath === '' ? '/' : $drivePath;
        setcookie(self::COOKIE_LEGACY_DRIVE, '', [
            'expires' => time() - 3600,
            'path' => $drivePath,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private static function shouldRedirectUnauthenticatedBrowserToLogin(string $path, string $webBase): bool
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'GET' && $method !== 'HEAD') {
            return false;
        }

        $login = WebBase::url($webBase, '/login');
        if ($path === $login || $path === $login.'/' || str_starts_with($path, $login.'/')) {
            return false;
        }

        $dest = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_DEST'] ?? ''));
        if ($dest === 'document') {
            return true;
        }

        if ($dest !== '') {
            return false;
        }

        if (str_contains($path, '/api/')) {
            return false;
        }

        $accept = (string) ($_SERVER['HTTP_ACCEPT'] ?? '');

        return str_contains($accept, 'text/html');
    }

    /** @return never */
    private static function redirectToLoginForm(string $webBase, string $path): void
    {
        $qs = isset($_SERVER['QUERY_STRING']) && is_string($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
            ? '?'.$_SERVER['QUERY_STRING']
            : '';
        $return = $path.$qs;
        $login = WebBase::url($webBase, '/login/');
        $url = $login.'?return='.rawurlencode($return);
        header('Location: '.$url, true, 302);
        exit;
    }

    /**
     * @return non-empty-string|null
     */
    public static function validatedUsername(string $realm): ?string
    {
        foreach ([self::COOKIE, self::COOKIE_LEGACY_DRIVE] as $cookieName) {
            $u = self::validatedUsernameFromCookie($cookieName, $realm);
            if ($u !== null) {
                return $u;
            }
        }

        return null;
    }

    /**
     * @return non-empty-string|null
     */
    private static function validatedUsernameFromCookie(string $cookieName, string $realm): ?string
    {
        if (!isset($_COOKIE[$cookieName]) || !is_string($_COOKIE[$cookieName])) {
            return null;
        }
        $secret = self::readSecret();
        if ($secret === null) {
            return null;
        }
        $raw = $_COOKIE[$cookieName];
        $parts = explode('.', $raw, 2);
        if (count($parts) !== 2) {
            return null;
        }
        [$b64Payload, $b64Sig] = $parts;
        $payloadJson = self::base64UrlDecode($b64Payload);
        $sig = self::base64UrlDecode($b64Sig);
        if ($payloadJson === null || $sig === null || $sig === '') {
            return null;
        }
        $expected = hash_hmac('sha256', $b64Payload, $secret, true);
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        try {
            /** @var mixed $data */
            $data = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($data)) {
            return null;
        }
        $v = $data['v'] ?? null;
        $u = isset($data['u']) && is_string($data['u']) ? strtolower(trim($data['u'])) : '';
        $r = isset($data['r']) && is_string($data['r']) ? $data['r'] : '';
        $e = isset($data['e']) && is_int($data['e'])
            ? $data['e']
            : (isset($data['e']) && is_numeric($data['e']) ? (int) $data['e'] : 0);
        if ($v !== self::COOKIE_VERSION || $u === '' || $r !== $realm || $e < time()) {
            return null;
        }

        return $u;
    }

    private static function issueCookie(string $username, string $realm, string $cookiePath): void
    {
        $secret = self::readSecret();
        if ($secret === null) {
            return;
        }
        $exp = time() + self::TTL_SEC;
        $payload = json_encode(
            [
                'v' => self::COOKIE_VERSION,
                'u' => strtolower(trim($username)),
                'r' => $realm,
                'e' => $exp,
            ],
            JSON_THROW_ON_ERROR
        );
        $b64Payload = self::base64UrlEncode($payload);
        $sig = hash_hmac('sha256', $b64Payload, $secret, true);
        $value = $b64Payload.'.'.self::base64UrlEncode($sig);
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $path = $cookiePath === '' ? '/' : $cookiePath;
        setcookie(self::COOKIE, $value, [
            'expires' => $exp,
            'path' => $path,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private static function secretPathPrimary(): string
    {
        return Paths::driveData().'/ui_auth_gate.secret';
    }

    private static function secretPathLegacy(): string
    {
        return Paths::driveData().'/drive_gate.secret';
    }

    private static function ensureSecretFile(): void
    {
        $primary = self::secretPathPrimary();
        if (is_readable($primary) && (int) @filesize($primary) >= 32) {
            return;
        }
        $legacy = self::secretPathLegacy();
        if (is_readable($legacy) && (int) @filesize($legacy) >= 32) {
            @copy($legacy, $primary);
            if (is_readable($primary) && (int) @filesize($primary) >= 32) {
                return;
            }
        }
        $dir = dirname($primary);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        file_put_contents($primary, random_bytes(32), LOCK_EX);
    }

    private static function readSecret(): ?string
    {
        $primary = self::secretPathPrimary();
        if (is_readable($primary)) {
            $s = file_get_contents($primary);
            if ($s !== false && strlen($s) >= 32) {
                return $s;
            }
        }
        $legacy = self::secretPathLegacy();
        if (is_readable($legacy)) {
            $s = file_get_contents($legacy);
            if ($s !== false && strlen($s) >= 32) {
                return $s;
            }
        }

        return null;
    }

    private static function base64UrlEncode(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $s): ?string
    {
        $b64 = strtr($s, '-_', '+/');
        $pad = strlen($b64) % 4;
        if ($pad > 0) {
            $b64 .= str_repeat('=', 4 - $pad);
        }
        $raw = base64_decode($b64, true);

        return $raw === false ? null : $raw;
    }
}
