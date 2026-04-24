<?php

declare(strict_types=1);

namespace App\Settings;

final class SettingsDefaults
{
    /**
     * @return array<string, mixed>
     */
    public static function all(): array
    {
        return [
            SettingsKeys::TIMEZONE => 'UTC',
            SettingsKeys::BASE_URI => '/',
            SettingsKeys::AUTH_REALM => 'SabreDAV',
            SettingsKeys::BROWSER_PLUGIN => true,
            SettingsKeys::FILES_ENABLED => true,
            SettingsKeys::CALENDAR_ENABLED => true,
            SettingsKeys::CONTACTS_ENABLED => true,
            SettingsKeys::MAIL_ENABLED => true,
            SettingsKeys::VOICE_SIGNALING_URL => '',
            SettingsKeys::VOICE_TURN_URL => '',
            SettingsKeys::VOICE_TURN_USERNAME => '',
            SettingsKeys::VOICE_TURN_CREDENTIAL => '',
            SettingsKeys::MAIL_IMAP_HOST => '',
            SettingsKeys::MAIL_IMAP_PORT => 993,
            SettingsKeys::MAIL_IMAP_SECURITY => 'ssl',
            SettingsKeys::MAIL_SMTP_HOST => '',
            SettingsKeys::MAIL_SMTP_PORT => 465,
            SettingsKeys::MAIL_SMTP_SECURITY => 'ssl',
        ];
    }

    /**
     * @param array<string, mixed> $dbValues
     *
     * @return array<string, mixed>
     */
    public static function normalize(array $dbValues): array
    {
        $base = self::all();
        foreach (SettingsKeys::all() as $key) {
            if (!array_key_exists($key, $dbValues)) {
                continue;
            }
            $v = $dbValues[$key];
            $base[$key] = match ($key) {
                SettingsKeys::BROWSER_PLUGIN,
                SettingsKeys::FILES_ENABLED,
                SettingsKeys::CALENDAR_ENABLED,
                SettingsKeys::CONTACTS_ENABLED,
                SettingsKeys::MAIL_ENABLED => (bool) $v,
                SettingsKeys::BASE_URI => self::normalizeBaseUri(is_string($v) ? $v : '/'),
                SettingsKeys::TIMEZONE, SettingsKeys::AUTH_REALM => is_string($v) && $v !== '' ? $v : $base[$key],
                SettingsKeys::VOICE_SIGNALING_URL,
                SettingsKeys::VOICE_TURN_URL,
                SettingsKeys::VOICE_TURN_USERNAME,
                SettingsKeys::VOICE_TURN_CREDENTIAL => is_string($v) ? $v : (string) ($base[$key] ?? ''),
                SettingsKeys::MAIL_IMAP_HOST,
                SettingsKeys::MAIL_SMTP_HOST => is_string($v) ? trim($v) : (string) ($base[$key] ?? ''),
                SettingsKeys::MAIL_IMAP_PORT => is_numeric($v)
                    ? max(1, min(65535, (int) $v))
                    : (int) ($base[SettingsKeys::MAIL_IMAP_PORT] ?? 993),
                SettingsKeys::MAIL_SMTP_PORT => is_numeric($v)
                    ? max(1, min(65535, (int) $v))
                    : (int) ($base[SettingsKeys::MAIL_SMTP_PORT] ?? 465),
                SettingsKeys::MAIL_IMAP_SECURITY,
                SettingsKeys::MAIL_SMTP_SECURITY => self::normMailSecurity(is_string($v) ? $v : ''),
                default => $v,
            };
        }

        return $base;
    }

    public static function normalizeBaseUri(string $base): string
    {
        $base = trim($base);
        if ($base === '' || $base[0] !== '/') {
            $base = '/'.$base;
        }

        return rtrim($base, '/').'/';
    }

    private static function normMailSecurity(string $s): string
    {
        $s = strtolower(trim($s));

        return in_array($s, ['ssl', 'starttls', 'none'], true) ? $s : 'ssl';
    }
}
