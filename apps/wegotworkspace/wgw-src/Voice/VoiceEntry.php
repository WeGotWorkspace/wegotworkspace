<?php

declare(strict_types=1);

namespace App\Voice;

use App\Config;
use App\Installer\WebBase;
use App\Pwa\PwaSupport;
use App\Settings\SettingsKeys;

/**
 * Injects {@code window.__SABRE_VOICE_CONFIG__} into the Aura Voice {@code index.html} shell.
 *
 * The main app lives at {@code /voice/} (Sabre auth required). Guests use {@code /voice/join/} without auth;
 * static assets under {@code /voice/assets/} stay public so that page can load JS/CSS.
 *
 * Signaling and TURN defaults come from {@code app_settings} (Admin → Settings), including for guest join pages
 * (TURN credentials are embedded in HTML like the signed-in shell — anyone who can open the guest link can read them).
 */
final class VoiceEntry
{
    public static function voiceHome(string $webBase): string
    {
        return WebBase::url($webBase, '/voice');
    }

    /**
     * True for {@code /voice/join}, {@code /voice/join/}, and {@code /voice/join/…} (not {@code /voice/joinery}).
     */
    public static function isGuestJoinPath(string $webBase, string $path): bool
    {
        $jp = self::voiceHome($webBase).'/join';

        return $path === $jp || $path === $jp.'/' || str_starts_with($path, $jp.'/');
    }

    public static function isVoiceAssetPath(string $webBase, string $path): bool
    {
        return str_starts_with($path, self::voiceHome($webBase).'/assets/');
    }

    private static function acceptIncludesHtml(): bool
    {
        $accept = (string) ($_SERVER['HTTP_ACCEPT'] ?? '');

        return str_contains($accept, 'text/html');
    }

    /**
     * HTML shell for the authenticated app ({@code /voice/…} except guest entry and assets).
     */
    public static function shouldServeProtectedHtmlShell(string $webBase, string $path): bool
    {
        if (self::isGuestJoinPath($webBase, $path)) {
            return false;
        }
        if (self::isVoiceAssetPath($webBase, $path)) {
            return false;
        }

        $home = self::voiceHome($webBase);
        if ($path === $home || $path === $home.'/' || $path === $home.'/index.html') {
            return true;
        }
        if ($path !== $home && !str_starts_with($path, $home.'/')) {
            return false;
        }
        if (str_contains($path, '/aura-signaling/')) {
            return false;
        }
        if (preg_match('#/assets/#', $path) === 1) {
            return false;
        }

        return self::acceptIncludesHtml();
    }

    /**
     * HTML shell for the public guest entry ({@code /voice/join/…}).
     */
    public static function shouldServeGuestHtmlShell(string $webBase, string $path): bool
    {
        if (!self::isGuestJoinPath($webBase, $path)) {
            return false;
        }
        if (str_contains($path, '/aura-signaling/')) {
            return false;
        }

        return self::acceptIncludesHtml();
    }

    /**
     * @param non-empty-string|null $username Sabre account when signed in (cookie or Basic); {@code null} for anonymous guests.
     * @param bool                  $guestEntryPoint When true, only {@code /voice/join/…} HTML shells (no auth required upstream).
     */
    public static function tryServeInjectedIndex(string $webBase, string $path, ?string $username, bool $guestEntryPoint = false): bool
    {
        if ($guestEntryPoint) {
            if (!self::shouldServeGuestHtmlShell($webBase, $path)) {
                return false;
            }
        } elseif (!self::shouldServeProtectedHtmlShell($webBase, $path)) {
            return false;
        }

        $index = VoiceStatic::distRoot().'/index.html';
        if (!is_readable($index)) {
            return false;
        }

        $html = (string) file_get_contents($index);
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

        $siteCfg = Config::load();
        $signalingUrl = self::resolveSignalingUrl($webBase, $scheme, $host, $siteCfg);
        $voiceBaseHref = $scheme.'://'.$host.WebBase::url($webBase, '/voice/');

        $authenticated = $username !== null && $username !== '';
        $payload = [
            'signalingUrl' => $signalingUrl,
            'displayName' => $authenticated ? $username : '',
            'canCreateRoom' => $authenticated,
            'guestJoinPath' => WebBase::url($webBase, '/voice/join/'),
            'logoutUrl' => WebBase::url($webBase, '/logout/'),
        ];

        $payload['turnUrl'] = (string) ($siteCfg[SettingsKeys::VOICE_TURN_URL] ?? '');
        $payload['turnUsername'] = (string) ($siteCfg[SettingsKeys::VOICE_TURN_USERNAME] ?? '');
        $payload['turnCredential'] = (string) ($siteCfg[SettingsKeys::VOICE_TURN_CREDENTIAL] ?? '');
        $payload['forceRelay'] = (bool) ($siteCfg[SettingsKeys::VOICE_FORCE_RELAY] ?? false);

        $json = json_encode(
            $payload,
            JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES
        );

        $baseHref = htmlspecialchars($voiceBaseHref, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $inject = '<base href="'.$baseHref.'">'
            ."\n".'<script>window.__SABRE_VOICE_CONFIG__='.$json.';</script>'
            ."\n".PwaSupport::headMetaTags($webBase, 'voice');

        if (preg_match('#<head[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE)) {
            $tag = $m[0][0];
            $pos = $m[0][1] + strlen($tag);
            $html = substr($html, 0, $pos)."\n".$inject.substr($html, $pos);
        } elseif (str_contains($html, '</head>')) {
            $html = str_replace('</head>', $inject."\n</head>", $html);
        } else {
            $html = $inject."\n".$html;
        }

        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        echo $html;

        return true;
    }

    /**
     * @param array<string, mixed> $siteCfg
     */
    private static function resolveSignalingUrl(string $webBase, string $scheme, string $host, array $siteCfg): string
    {
        $override = trim((string) ($siteCfg[SettingsKeys::VOICE_SIGNALING_URL] ?? ''));
        if ($override !== '') {
            if (filter_var($override, FILTER_VALIDATE_URL)) {
                return $override;
            }
        }

        return $scheme.'://'.$host.WebBase::url($webBase, '/api/v1/voice');
    }
}
