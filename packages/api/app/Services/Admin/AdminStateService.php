<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\AppSetting;
use App\Services\Settings\GroupDirectoryService;
use App\Services\Update\UpdateStateService;
use App\Settings\SettingKeys;
use App\Support\ApiUrlBuilder;
use App\Support\WgwSettings;

final class AdminStateService
{
    public function __construct(
        private AdminUserDirectoryService $users,
        private GroupDirectoryService $groups,
        private UpdateStateService $updates,
        private ApiUrlBuilder $urls,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function snapshot(string $adminUsername): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'users' => $this->users->listSummaries(),
            'groups' => $this->groups->listGroupSummaries(),
            'mail' => [
                'imapHost' => (string) ($cfg[SettingKeys::MAIL_IMAP_HOST] ?? ''),
                'imapPort' => (int) ($cfg[SettingKeys::MAIL_IMAP_PORT] ?? 993),
                'imapSecurity' => (string) ($cfg[SettingKeys::MAIL_IMAP_SECURITY] ?? 'ssl'),
                'smtpHost' => (string) ($cfg[SettingKeys::MAIL_SMTP_HOST] ?? ''),
                'smtpPort' => (int) ($cfg[SettingKeys::MAIL_SMTP_PORT] ?? 587),
                'smtpSecurity' => (string) ($cfg[SettingKeys::MAIL_SMTP_SECURITY] ?? 'starttls'),
            ],
            'voice' => $this->voiceSettings(),
            'apps' => [
                'calendars' => (bool) ($cfg[SettingKeys::CALENDAR_ENABLED] ?? true),
                'contacts' => (bool) ($cfg[SettingKeys::CONTACTS_ENABLED] ?? true),
            ],
            'webdav' => [
                'sabreUi' => (bool) ($cfg[SettingKeys::BROWSER_PLUGIN] ?? true),
                'timezone' => (string) ($cfg[SettingKeys::TIMEZONE] ?? 'UTC'),
                'baseUri' => (string) ($cfg[SettingKeys::BASE_URI] ?? '/'),
                'authRealm' => (string) ($cfg[SettingKeys::AUTH_REALM] ?? 'SabreDAV'),
            ],
            'updates' => $this->updates->snapshot(),
            'currentUser' => $adminUsername,
            'logoutUrl' => $this->urls->logout(),
        ];
    }

    /**
     * @return array{stunUrls: string, turnUrls: string, turnUsername: string, turnPassword: string, forceRelay: bool}
     */
    private function voiceSettings(): array
    {
        $normalizeUrls = static function (mixed $value): string {
            if (! is_string($value)) {
                return '';
            }
            $parts = array_filter(
                array_map(
                    static fn (string $piece): string => trim($piece),
                    preg_split('/[\r\n,]+/', $value) ?: []
                ),
                static fn (string $piece): bool => $piece !== ''
            );

            return implode(', ', $parts);
        };

        return [
            'stunUrls' => $normalizeUrls(AppSetting::getValue(SettingKeys::VOICE_STUN_URL, '')),
            'turnUrls' => $normalizeUrls(AppSetting::getValue(SettingKeys::VOICE_TURN_URL, '')),
            'turnUsername' => trim((string) AppSetting::getValue(SettingKeys::VOICE_TURN_USERNAME, '')),
            'turnPassword' => trim((string) AppSetting::getValue(SettingKeys::VOICE_TURN_CREDENTIAL, '')),
            'forceRelay' => (bool) AppSetting::getValue(SettingKeys::VOICE_FORCE_RELAY, false),
        ];
    }
}
