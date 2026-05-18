<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Models\Principal;
use App\Services\Mail\MailCredentialService;
use App\Support\ApiUrlBuilder;
use App\Support\WgwSettings;

final class SettingsStateService
{
    public function __construct(
        private GroupDirectoryService $groups,
        private MailCredentialService $mailCredentials,
        private ApiUrlBuilder $urls,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function forUsername(string $username): array
    {
        $principal = Principal::forUsername($username);
        $displayName = trim((string) ($principal?->displayname ?? ''));
        $email = trim((string) ($principal?->email ?? ''));

        $mail = $this->mailCredentials->loadAccount($username) ?? ['imapUsername' => '', 'imapPassword' => ''];
        $cfg = WgwSettings::normalized();

        return [
            'user' => [
                'username' => $username,
                'displayName' => $displayName !== '' ? $displayName : $username,
                'email' => $email,
            ],
            'groups' => $this->groups->groupsForUser($username),
            'mail' => [
                'imapUsername' => (string) ($mail['imapUsername'] ?? ''),
                'imapHasPassword' => ((string) ($mail['imapPassword'] ?? '')) !== '',
            ],
            'mailServer' => [
                'imapHost' => (string) ($cfg[WgwSettings::MAIL_IMAP_HOST] ?? ''),
                'imapPort' => (int) ($cfg[WgwSettings::MAIL_IMAP_PORT] ?? 993),
                'imapSecurity' => (string) ($cfg[WgwSettings::MAIL_IMAP_SECURITY] ?? 'ssl'),
                'smtpHost' => (string) ($cfg[WgwSettings::MAIL_SMTP_HOST] ?? ''),
                'smtpPort' => (int) ($cfg[WgwSettings::MAIL_SMTP_PORT] ?? 465),
                'smtpSecurity' => (string) ($cfg[WgwSettings::MAIL_SMTP_SECURITY] ?? 'ssl'),
            ],
            'logoutUrl' => $this->urls->logout(),
        ];
    }
}
