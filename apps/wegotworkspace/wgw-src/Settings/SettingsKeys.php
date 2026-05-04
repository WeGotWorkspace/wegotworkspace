<?php

declare(strict_types=1);

namespace App\Settings;

final class SettingsKeys
{
    public const TIMEZONE = 'timezone';

    public const BASE_URI = 'base_uri';

    public const AUTH_REALM = 'auth_realm';

    public const BROWSER_PLUGIN = 'browser_plugin';

    public const FILES_ENABLED = 'files_enabled';

    public const CALENDAR_ENABLED = 'calendar_enabled';

    public const CONTACTS_ENABLED = 'contacts_enabled';

    public const MAIL_ENABLED = 'mail_enabled';

    /** Optional absolute URL to Aura Voice signaling base endpoint. Empty = use built-in /api/v1/voice path. */
    public const VOICE_SIGNALING_URL = 'voice_signaling_url';

    public const VOICE_TURN_URL = 'voice_turn_url';

    public const VOICE_TURN_USERNAME = 'voice_turn_username';

    public const VOICE_TURN_CREDENTIAL = 'voice_turn_credential';

    /** When enabled, clients use TURN relay-only mode from the start. */
    public const VOICE_FORCE_RELAY = 'voice_force_relay';

    /** IMAP/SMTP endpoints for Webmail (site-wide). Per-user credentials live in SQL ({@code mail_user_credentials}). */
    public const MAIL_IMAP_HOST = 'mail_imap_host';

    public const MAIL_IMAP_PORT = 'mail_imap_port';

    public const MAIL_IMAP_SECURITY = 'mail_imap_security';

    public const MAIL_SMTP_HOST = 'mail_smtp_host';

    public const MAIL_SMTP_PORT = 'mail_smtp_port';

    public const MAIL_SMTP_SECURITY = 'mail_smtp_security';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::TIMEZONE,
            self::BASE_URI,
            self::AUTH_REALM,
            self::BROWSER_PLUGIN,
            self::FILES_ENABLED,
            self::CALENDAR_ENABLED,
            self::CONTACTS_ENABLED,
            self::MAIL_ENABLED,
            self::VOICE_SIGNALING_URL,
            self::VOICE_TURN_URL,
            self::VOICE_TURN_USERNAME,
            self::VOICE_TURN_CREDENTIAL,
            self::VOICE_FORCE_RELAY,
            self::MAIL_IMAP_HOST,
            self::MAIL_IMAP_PORT,
            self::MAIL_IMAP_SECURITY,
            self::MAIL_SMTP_HOST,
            self::MAIL_SMTP_PORT,
            self::MAIL_SMTP_SECURITY,
        ];
    }
}
