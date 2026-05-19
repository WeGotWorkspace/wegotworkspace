<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Settings\SettingKeys;
use App\Services\Settings\GroupDirectoryService;
use App\Services\Update\UpdateStateService;
use App\Support\ApiUrlBuilder;
use App\Support\WgwSettings;

final class AdminStateService
{
    public function __construct(
        private AdminUserDirectoryService $users,
        private GroupDirectoryService $groups,
        private UpdateStateService $updates,
        private ApiUrlBuilder $urls,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshot(string $adminUsername): array
    {
        $cfg = WgwSettings::normalized();
        $voiceUrls = (string) ($cfg[SettingKeys::VOICE_TURN_URL] ?? '');
        $stun = [];
        $turn = [];
        foreach (preg_split('/[\r\n,]+/', $voiceUrls) ?: [] as $piece) {
            $url = trim((string) $piece);
            if ($url === '') {
                continue;
            }
            if (preg_match('#^stuns?:#i', $url) === 1) {
                $stun[] = $url;
            } else {
                $turn[] = $url;
            }
        }

        return [
            'users' => $this->users->listSummaries(),
            'groups' => $this->groups->listGroupSummaries(),
            'mail' => [
                'imapHost' => (string) ($cfg[SettingKeys::MAIL_IMAP_HOST] ?? ''),
                'imapPort' => (int) ($cfg[SettingKeys::MAIL_IMAP_PORT] ?? 993),
                'imapSecurity' => (string) ($cfg[SettingKeys::MAIL_IMAP_SECURITY] ?? 'ssl'),
                'smtpHost' => (string) ($cfg[SettingKeys::MAIL_SMTP_HOST] ?? ''),
                'smtpPort' => (int) ($cfg[SettingKeys::MAIL_SMTP_PORT] ?? 465),
                'smtpSecurity' => (string) ($cfg[SettingKeys::MAIL_SMTP_SECURITY] ?? 'ssl'),
            ],
            'voice' => [
                'signalingUrl' => '',
                'stunUrls' => implode("\n", $stun),
                'turnUrls' => implode("\n", $turn),
                'turnUsername' => (string) ($cfg[SettingKeys::VOICE_TURN_USERNAME] ?? ''),
                'turnPassword' => (string) ($cfg[SettingKeys::VOICE_TURN_CREDENTIAL] ?? ''),
                'forceRelay' => false,
            ],
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
}
