<?php

declare(strict_types=1);

namespace App\Mail;

use App\Settings\SettingsKeys;

/**
 * Site-wide IMAP/SMTP host settings from {@code app_settings} (admin UI).
 */
final class MailServerSettings
{
    /**
     * @param array<string, mixed> $cfg normalized {@see \App\Config::load()} array
     */
    public static function serversConfigured(array $cfg): bool
    {
        $imap = trim((string) ($cfg[SettingsKeys::MAIL_IMAP_HOST] ?? ''));
        $smtp = trim((string) ($cfg[SettingsKeys::MAIL_SMTP_HOST] ?? ''));

        return $imap !== '' && $smtp !== '';
    }

    /**
     * @param array<string, mixed> $cfg
     *
     * @return array{imap: array{host: string, port: int, security: string}, smtp: array{host: string, port: int, security: string}}
     */
    public static function endpoints(array $cfg): array
    {
        return [
            'imap' => [
                'host' => trim((string) ($cfg[SettingsKeys::MAIL_IMAP_HOST] ?? '')),
                'port' => self::port($cfg, SettingsKeys::MAIL_IMAP_PORT, 993),
                'security' => self::security($cfg, SettingsKeys::MAIL_IMAP_SECURITY),
            ],
            'smtp' => [
                'host' => trim((string) ($cfg[SettingsKeys::MAIL_SMTP_HOST] ?? '')),
                'port' => self::port($cfg, SettingsKeys::MAIL_SMTP_PORT, 465),
                'security' => self::security($cfg, SettingsKeys::MAIL_SMTP_SECURITY),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $cfg
     */
    private static function port(array $cfg, string $key, int $fallback): int
    {
        $p = $cfg[$key] ?? $fallback;
        if (!is_numeric($p)) {
            return $fallback;
        }

        return max(1, min(65535, (int) $p));
    }

    /**
     * @param array<string, mixed> $cfg
     */
    private static function security(array $cfg, string $key): string
    {
        $s = isset($cfg[$key]) && is_string($cfg[$key]) ? strtolower(trim($cfg[$key])) : 'ssl';

        return in_array($s, ['ssl', 'starttls', 'none'], true) ? $s : 'ssl';
    }
}
