<?php

declare(strict_types=1);

namespace App\Dav\Auth;

use Illuminate\Support\Facades\Storage;

/**
 * Validates the signed {@code sabre_ui_auth} cookie issued after browser sign-in.
 */
final class SabreUiAuthGate
{
    private const COOKIE = 'sabre_ui_auth';

    private const COOKIE_VERSION = 1;

    /**
     * @return non-empty-string|null
     */
    public static function validatedUsername(string $realm): ?string
    {
        $raw = $_COOKIE[self::COOKIE] ?? null;
        if (! is_string($raw) || $raw === '') {
            return null;
        }

        $parts = explode('.', $raw, 2);
        if (count($parts) !== 2) {
            return null;
        }

        $secret = self::readSecret();
        if ($secret === null) {
            return null;
        }

        [$b64Payload, $b64Sig] = $parts;
        $expected = self::base64UrlEncode(hash_hmac('sha256', $b64Payload, $secret, true));
        if (! hash_equals($expected, $b64Sig)) {
            return null;
        }

        $payloadJson = base64_decode(strtr($b64Payload, '-_', '+/'), true);
        if ($payloadJson === false) {
            return null;
        }

        try {
            /** @var mixed $payload */
            $payload = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        if (! is_array($payload)) {
            return null;
        }
        if (($payload['v'] ?? null) !== self::COOKIE_VERSION) {
            return null;
        }
        if (($payload['r'] ?? '') !== $realm) {
            return null;
        }
        $exp = $payload['exp'] ?? 0;
        if (! is_int($exp) || $exp < time()) {
            return null;
        }
        $username = $payload['u'] ?? '';
        if (! is_string($username) || $username === '') {
            return null;
        }

        return strtolower(trim($username));
    }

    private static function readSecret(): ?string
    {
        $disk = Storage::disk('wgw_data');
        if (! $disk->exists('.ui-auth-secret')) {
            return null;
        }
        $raw = $disk->get('.ui-auth-secret');

        return $raw !== '' ? $raw : null;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
