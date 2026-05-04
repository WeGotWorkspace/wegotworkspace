<?php

declare(strict_types=1);

namespace App\Mail;

use App\Config;

/**
 * Resolves per-request mail transport: admin server endpoints + principal identity + per-user IMAP credentials.
 */
final class MailUserMailRuntime
{
    /**
     * @param array<string, mixed> $cfg
     * @param array{imapUsername: string, imapPassword: string}|null $account
     */
    public static function isReady(array $cfg, ?array $account): bool
    {
        return MailServerSettings::serversConfigured($cfg)
            && MailCredentialStore::isAccountConfigured($account);
    }

    /**
     * @return array{
     *   displayName: string,
     *   emailAddress: string,
     *   imap: array{host: string, port: int, security: string, username: string, password: string},
     *   smtp: array{host: string, port: int, security: string, username: string, password: string}
     * }|null
     */
    public static function resolve(\PDO $pdo, string $username): ?array
    {
        $cfg = Config::load();
        $account = MailCredentialStore::loadAccount($pdo, $username);
        if (!self::isReady($cfg, $account)) {
            return null;
        }
        $identity = MailPrincipalIdentity::fetch($pdo, $username);
        $end = MailServerSettings::endpoints($cfg);
        $u = $account['imapUsername'];
        $p = $account['imapPassword'];

        return [
            'displayName' => $identity['displayName'],
            'emailAddress' => $identity['emailAddress'],
            'imap' => [
                'host' => $end['imap']['host'],
                'port' => $end['imap']['port'],
                'security' => $end['imap']['security'],
                'username' => $u,
                'password' => $p,
            ],
            'smtp' => [
                'host' => $end['smtp']['host'],
                'port' => $end['smtp']['port'],
                'security' => $end['smtp']['security'],
                'username' => $u,
                'password' => $p,
            ],
        ];
    }
}
