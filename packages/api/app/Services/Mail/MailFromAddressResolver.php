<?php

declare(strict_types=1);

namespace App\Services\Mail;

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Resolves the SMTP envelope {@code From} address for webmail send/draft MIME builders.
 */
final class MailFromAddressResolver
{
    /**
     * @param array{
     *   displayName?: string,
     *   emailAddress?: string,
     *   imap?: array{username?: string},
     *   smtp?: array{host?: string}
     * } $cred
     */
    public static function resolve(array $cred): string
    {
        $identity = trim((string) ($cred['emailAddress'] ?? ''));
        $account = trim((string) ($cred['imap']['username'] ?? ''));

        $candidates = [];
        if ($account !== '') {
            $candidates[] = $account;
        }
        if ($identity !== '' && ! in_array($identity, $candidates, true)) {
            $candidates[] = $identity;
        }
        $derived = self::deriveFromAccountAndHost($account, (string) ($cred['smtp']['host'] ?? ''));
        if ($derived !== null && ! in_array($derived, $candidates, true)) {
            $candidates[] = $derived;
        }

        foreach ($candidates as $addr) {
            if (PHPMailer::validateAddress($addr)) {
                return $addr;
            }
        }

        throw new \RuntimeException('invalid_from_address');
    }

    private static function deriveFromAccountAndHost(string $account, string $smtpHost): ?string
    {
        if ($account === '' || str_contains($account, '@')) {
            return null;
        }
        $host = strtolower(trim($smtpHost));
        if ($host === '') {
            return null;
        }
        if (str_starts_with($host, 'mail.')) {
            $host = substr($host, 5);
        }
        if ($host === '' || ! str_contains($host, '.')) {
            return null;
        }

        return $account.'@'.$host;
    }
}
