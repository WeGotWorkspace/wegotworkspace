<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Exceptions\ApiHttpException;
use App\Models\MailUserCredential;

final class MailCredentialService
{
    public function __construct(private MailSecretService $secrets)
    {
    }

    /**
     * @return array{imapUsername: string, imapPassword: string}|null
     */
    public function loadAccount(string $username): ?array
    {
        $row = MailUserCredential::query()->find(strtolower(trim($username)));
        if ($row === null) {
            return null;
        }
        $secret = $this->secrets->readBinary();
        if ($secret === null) {
            return null;
        }

        return [
            'imapUsername' => trim((string) $row->imap_username),
            'imapPassword' => $this->decryptField((string) $row->password_enc, $username, $secret),
        ];
    }

    public function save(string $username, string $imapUsername, string $imapPassword): void
    {
        $existing = $this->loadAccount($username) ?? ['imapUsername' => '', 'imapPassword' => ''];
        $mergedUsername = $imapUsername !== '' ? $imapUsername : $existing['imapUsername'];
        $mergedPassword = $imapPassword !== '' ? $imapPassword : $existing['imapPassword'];

        $this->secrets->ensureSecretFile();
        $secret = $this->secrets->readBinary();
        if ($secret === null) {
            throw new ApiHttpException(500, 'Could not initialize mail credential encryption secret.', 'server_error');
        }

        $normalizedUser = strtolower(trim($username));
        MailUserCredential::query()->updateOrInsert(
            ['username' => $normalizedUser],
            [
                'imap_username' => $mergedUsername,
                'password_enc' => $this->encryptField($mergedPassword, $normalizedUser, $secret),
                'updated_at' => time(),
            ]
        );
    }

    private function key(string $username, string $secret): string
    {
        return substr(hash('sha256', $secret.'|mail|'.strtolower(trim($username)), true), 0, 32);
    }

    private function encryptField(string $plain, string $username, string $secret): string
    {
        if ($plain === '') {
            return '';
        }
        if (! function_exists('openssl_encrypt')) {
            throw new ApiHttpException(500, 'openssl extension required to store mail passwords.', 'server_error');
        }
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $this->key($username, $secret), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($cipher === false) {
            throw new ApiHttpException(500, 'Could not encrypt mail password.', 'server_error');
        }

        return base64_encode($iv.$tag.$cipher);
    }

    private function decryptField(string $blob, string $username, string $secret): string
    {
        if ($blob === '' || ! function_exists('openssl_decrypt')) {
            return '';
        }
        $raw = base64_decode($blob, true);
        if ($raw === false || strlen($raw) < 29) {
            return '';
        }
        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $ct = substr($raw, 28);
        $pt = openssl_decrypt($ct, 'aes-256-gcm', $this->key($username, $secret), OPENSSL_RAW_DATA, $iv, $tag);

        return is_string($pt) ? $pt : '';
    }
}
