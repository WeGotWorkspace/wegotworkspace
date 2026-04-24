<?php

declare(strict_types=1);

namespace App\Mail;

use App\Paths;

/**
 * Per-Sabre-user IMAP login (username + password) in SQL table {@code mail_user_credentials}.
 *
 * Existing file-based credentials under {@code wgw-content/mail/} are read as fallback and
 * migrated into SQL on first access.
 * Hosts and ports are site-wide in admin settings ({@see \App\Settings\SettingsKeys}).
 */
final class MailCredentialStore
{
    private const TABLE = 'mail_user_credentials';
    private const VERSION_LEGACY = 1;
    private const VERSION = 2;

    public static function accountPath(string $username): string
    {
        $safe = preg_replace('/[^a-z0-9._-]+/i', '_', strtolower(trim($username))) ?? 'user';

        return Paths::data().'/mail/'.$safe.'.json';
    }

    /**
     * @return array{imapUsername: string, imapPassword: string}|null
     */
    public static function loadAccount(\PDO $pdo, string $username): ?array
    {
        self::ensureTable($pdo);

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

        $legacy = self::loadLegacyFileAccount($username);
        if ($legacy === null) {
            return null;
        }

        self::persistAccount($pdo, $username, $legacy['imapUsername'], $legacy['imapPassword']);
        @unlink(self::accountPath($username));

        return $legacy;
    }

    /**
     * @param array<string, mixed> $j
     *
     * @return array{imapUsername: string, imapPassword: string}|null
     */
    private static function migrateLegacyV1(array $j, string $sabreUsername, string $secret): ?array
    {
        $imap = $j['imap'] ?? null;
        if (!is_array($imap)) {
            return null;
        }
        $user = trim((string) ($imap['username'] ?? ''));

        return [
            'imapUsername' => $user,
            'imapPassword' => self::decryptField($imap['passwordEnc'] ?? null, $sabreUsername, $secret),
        ];
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
        self::ensureTable($pdo);
        $merged = self::mergeAccount($pdo, $username, $input);
        self::persistAccount($pdo, $username, $merged['imapUsername'], $merged['imapPassword']);
    }

    private static function ensureTable(\PDO $pdo): void
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec(
                "CREATE TABLE IF NOT EXISTS mail_user_credentials (
                    username VARCHAR(191) NOT NULL PRIMARY KEY,
                    imap_username VARCHAR(255) NOT NULL DEFAULT '',
                    password_enc TEXT NOT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );

            return;
        }
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS mail_user_credentials (
                username TEXT NOT NULL PRIMARY KEY,
                imap_username TEXT NOT NULL DEFAULT '',
                password_enc TEXT NOT NULL DEFAULT '',
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            )"
        );
    }

    /**
     * @return array{imapUsername: string, imapPassword: string}|null
     */
    private static function loadLegacyFileAccount(string $username): ?array
    {
        $path = self::accountPath($username);
        if (!is_readable($path)) {
            return null;
        }
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            return null;
        }
        try {
            /** @var mixed $j */
            $j = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($j)) {
            return null;
        }
        $secret = MailSecret::readBinary();
        if ($secret === null) {
            return null;
        }
        $v = (int) ($j['v'] ?? 0);
        if ($v === self::VERSION) {
            $user = is_string($j['imapUsername'] ?? null) ? trim($j['imapUsername']) : '';

            return [
                'imapUsername' => $user,
                'imapPassword' => self::decryptField($j['passwordEnc'] ?? null, $username, $secret),
            ];
        }
        if ($v === self::VERSION_LEGACY) {
            return self::migrateLegacyV1($j, $username, $secret);
        }

        return null;
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
