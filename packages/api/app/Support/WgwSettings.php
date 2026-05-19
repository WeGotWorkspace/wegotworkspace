<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\AppSetting;

final class WgwSettings
{
    public const MAIL_IMAP_HOST = 'mail_imap_host';

    public const MAIL_IMAP_PORT = 'mail_imap_port';

    public const MAIL_IMAP_SECURITY = 'mail_imap_security';

    public const MAIL_SMTP_HOST = 'mail_smtp_host';

    public const MAIL_SMTP_PORT = 'mail_smtp_port';

    public const MAIL_SMTP_SECURITY = 'mail_smtp_security';

    public const BASE_URI = 'base_uri';

    public const FILES_ENABLED = 'files_enabled';

    /**
     * @return array<string, mixed>
     */
    public static function normalized(): array
    {
        $db = [];
        foreach (AppSetting::query()->get(['name', 'value']) as $row) {
            $db[(string) $row->name] = AppSetting::decodeValue((string) $row->value);
        }

        return array_merge(self::defaults(), self::coerce($db));
    }

    /**
     * @return array<string, mixed>
     */
    private static function defaults(): array
    {
        return [
            self::BASE_URI => '/',
            self::FILES_ENABLED => true,
            self::MAIL_IMAP_HOST => '',
            self::MAIL_IMAP_PORT => 993,
            self::MAIL_IMAP_SECURITY => 'ssl',
            self::MAIL_SMTP_HOST => '',
            self::MAIL_SMTP_PORT => 465,
            self::MAIL_SMTP_SECURITY => 'ssl',
        ];
    }

    /**
     * @param array<string, mixed> $db
     * @return array<string, mixed>
     */
    private static function coerce(array $db): array
    {
        $out = [];
        foreach (array_keys(self::defaults()) as $key) {
            if (! array_key_exists($key, $db)) {
                continue;
            }
            $out[$key] = match ($key) {
                self::MAIL_IMAP_PORT, self::MAIL_SMTP_PORT => (int) $db[$key],
                self::FILES_ENABLED => (bool) $db[$key],
                default => $db[$key],
            };
        }

        return $out;
    }
}
