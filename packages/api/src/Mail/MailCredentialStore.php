<?php

declare(strict_types=1);

namespace App\Mail;

/**
 * Per-Sabre-user IMAP login (username + password) in SQL table {@code mail_user_credentials}.
 *
 * Hosts and ports are site-wide in admin settings ({@see \App\Settings\SettingsKeys}).
 */
final class MailCredentialStore
{
    private const TABLE = 'mail_user_credentials';

    /**
     * @return array{imapUsername: string, imapPassword: string}|null
     */
    public static function loadAccount(\PDO $pdo, string $username): ?array
    {
        $stmt = $pdo->prepare('SELECT imap_username, password_enc FROM '.self::TABLE.' WHERE username = ?');
        $stmt->execute([strtolower(trim($username))]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (is_array($row)) {
            $secret = MailSecret::readBinary();
            if ($secret === null) {
                return null;
            }

            return [
                'imapUsername' => trim((string) ($row['imap_username'] ?? '')),
                'imapPassword' => self::decryptField($row['password_enc'] ?? null, $username, $secret),
            ];
        }

        return null;
    }

    /**
     * @param array{imapUsername: string, imapPassword: string}|null $account
     */
    public static function isAccountConfigured(?array $account): bool
    {
        if ($account === null) {
            return false;
        }

        return trim($account['imapUsername']) !== '' && ($account['imapPassword'] ?? '') !== '';
    }

    /**
     * @param array{imap?: array{username?: string, password?: string}} $input
     *
     * @return array{imapUsername: string, imapPassword: string}
     */
    private static function mergeAccount(\PDO $pdo, string $username, array $input): array
    {
        $existing = self::loadAccount($pdo, $username) ?? ['imapUsername' => '', 'imapPassword' => ''];
        $imapIn = is_array($input['imap'] ?? null) ? $input['imap'] : [];
        $u = is_string($imapIn['username'] ?? null) ? trim($imapIn['username']) : $existing['imapUsername'];
        $pass = self::mergePassword(
            is_string($imapIn['password'] ?? null) ? $imapIn['password'] : null,
            $existing['imapPassword'] ?? ''
        );

        return ['imapUsername' => $u, 'imapPassword' => $pass];
    }

    /**
     * @param array{imap?: array{username?: string, password?: string}} $input
     */
    public static function save(\PDO $pdo, string $username, array $input): void
    {
        $merged = self::mergeAccount($pdo, $username, $input);
        self::persistAccount($pdo, $username, $merged['imapUsername'], $merged['imapPassword']);
    }

    private static function persistAccount(\PDO $pdo, string $username, string $imapUsername, string $imapPassword): void
    {
        MailSecret::ensureSecretFile();
        $secret = MailSecret::readBinary();
        if ($secret === null) {
            throw new \RuntimeException('Could not initialize mail credential encryption secret.');
        }

        $normalizedUser = strtolower(trim($username));
        $enc = self::encryptField($imapPassword, $normalizedUser, $secret);
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $pdo->prepare(
                'INSERT INTO '.self::TABLE.' (username, imap_username, password_enc) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE imap_username = VALUES(imap_username), password_enc = VALUES(password_enc)'
            );
            $stmt->execute([$normalizedUser, $imapUsername, $enc]);

            return;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO '.self::TABLE.' (username, imap_username, password_enc, updated_at)
             VALUES (?, ?, ?, strftime(\'%s\', \'now\'))
             ON CONFLICT(username) DO UPDATE SET
               imap_username = excluded.imap_username,
               password_enc = excluded.password_enc,
               updated_at = excluded.updated_at'
        );
        $stmt->execute([$normalizedUser, $imapUsername, $enc]);
    }

    private static function mergePassword(?string $incoming, string $existing): string
    {
        if ($incoming === null || $incoming === '' || $incoming === '__unchanged__') {
            return $existing;
        }

        return $incoming;
    }

    private static function key(string $username, string $secret): string
    {
        return substr(hash('sha256', $secret.'|mail|'.strtolower(trim($username)), true), 0, 32);
    }

    private static function encryptField(string $plain, string $username, string $secret): string
    {
        if ($plain === '') {
            return '';
        }
        if (!function_exists('openssl_encrypt')) {
            throw new \RuntimeException('openssl extension required to store mail passwords.');
        }
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', self::key($username, $secret), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($cipher === false) {
            throw new \RuntimeException('openssl_encrypt failed');
        }

        return base64_encode($iv.$tag.$cipher);
    }

    private static function decryptField(mixed $blob, string $username, string $secret): string
    {
        if (!is_string($blob) || $blob === '') {
            return '';
        }
        if (!function_exists('openssl_decrypt')) {
            return '';
        }
        $raw = base64_decode($blob, true);
        if ($raw === false || strlen($raw) < 12 + 16 + 1) {
            return '';
        }
        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $ct = substr($raw, 28);
        $pt = openssl_decrypt($ct, 'aes-256-gcm', self::key($username, $secret), OPENSSL_RAW_DATA, $iv, $tag);
        if (!is_string($pt)) {
            return '';
        }

        return $pt;
    }
}
