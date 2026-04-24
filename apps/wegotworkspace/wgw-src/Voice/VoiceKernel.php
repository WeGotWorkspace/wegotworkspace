<?php

declare(strict_types=1);

namespace App\Voice;

use App\Config;
use App\Installer\WebBase;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

/**
 * Serves Aura Voice (https://github.com/woutervroege/bright-face-connect) at {@code /voice/} with bundled WebRTC UI
 * and PHP signaling at {@code /voice/aura-signaling/rooms.php}.
 *
 * The main UI at {@code /voice/} requires the same Sabre account as Drive ({@code /login/}, UI cookie, or HTTP Basic).
 * Guests join without login
 * via {@code /voice/join/}. Static assets under {@code /voice/assets/} are public so that guest page can load.
 */
final class VoiceKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/voice');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function isSignalingPath(string $webBase, string $path): bool
    {
        return $path === WebBase::url($webBase, '/voice/aura-signaling/rooms.php');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        // `/voice` (no slash) makes relative `./assets/…` resolve to `/assets/…` (blank app). Canonicalize to `/voice/`.
        $voiceNoSlash = WebBase::url($webBase, '/voice');
        if ($path === $voiceNoSlash) {
            self::redirectTo($webBase, '/voice/');

            return true;
        }

        $joinNoSlash = WebBase::url($webBase, '/voice/join');
        if ($path === $joinNoSlash) {
            self::redirectTo($webBase, '/voice/join/');

            return true;
        }

        $cfg = Config::load();
        if (!($cfg[SettingsKeys::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

            return true;
        }

        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');

        if (self::isSignalingPath($webBase, $path)) {
            VoiceSignaling::respond($pdo, $realm);

            return true;
        }

        if (!VoiceStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        // Public: hashed bundles (needed for unauthenticated guests on /voice/join/).
        if (VoiceEntry::isVoiceAssetPath($webBase, $path)) {
            if (VoiceStatic::tryServe($webBase, $path)) {
                return true;
            }
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        // Public: guest join entry (same SPA; signaling join to non-empty rooms stays public in VoiceSignaling).
        if (VoiceEntry::isGuestJoinPath($webBase, $path)) {
            $guestUser = VoiceSabreAuth::tryAuthenticatedUser($pdo, $realm);
            if (VoiceEntry::tryServeInjectedIndex($webBase, $path, $guestUser, true)) {
                return true;
            }
            if (VoiceStatic::tryServe($webBase, $path)) {
                return true;
            }
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        // Protected: main app (same auth gate as Drive / Office HTML).
        $username = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);

        if (VoiceEntry::tryServeInjectedIndex($webBase, $path, $username, false)) {
            return true;
        }

        if (VoiceStatic::tryServe($webBase, $path)) {
            return true;
        }

        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';

        return true;
    }

    private static function redirectTo(string $webBase, string $path): void
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $qs = isset($_SERVER['QUERY_STRING']) && is_string($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
            ? '?'.$_SERVER['QUERY_STRING']
            : '';
        header('Location: '.$scheme.'://'.$host.WebBase::url($webBase, $path).$qs, true, 302);
    }

    private static function respondDistMissing(string $webBase): void
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Voice</title>';
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Aura Voice</h1>';
        echo '<p>The Voice UI build is missing. From the project root, run <code>pnpm --filter @wgw/voice-ui build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/voice-ui/</code>; the Vite build writes to <code>wgw-modules/voice/dist/</code>.</p>';
        echo '<p class="hint">Signed-in users: <code>'.htmlspecialchars(WebBase::url($webBase, '/voice/'), ENT_QUOTES, 'UTF-8').'</code> · Guests (join with a room code only): <code>'.htmlspecialchars(WebBase::url($webBase, '/voice/join/'), ENT_QUOTES, 'UTF-8').'</code></p>';
        echo '</body></html>';
    }
}
