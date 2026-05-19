<?php

declare(strict_types=1);

namespace Tests\Support;

final class AuthTestKeys
{
    /**
     * @return array{
     *   private_key: string,
     *   public_key: string,
     *   issuer: string,
     *   audience: string,
     *   kid: string
     * }
     */
    public static function rsaPair(string $kid = 'test-kid'): array
    {
        $resource = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        if ($resource === false) {
            throw new \RuntimeException('Could not generate test RSA key pair.');
        }

        $privatePem = '';
        if (! openssl_pkey_export($resource, $privatePem)) {
            throw new \RuntimeException('Could not export test private key.');
        }
        $details = openssl_pkey_get_details($resource);
        if (! is_array($details) || ! is_string($details['key'] ?? null)) {
            throw new \RuntimeException('Could not read test public key.');
        }

        return [
            'private_key' => $privatePem,
            'public_key' => $details['key'],
            'issuer' => 'test-issuer',
            'audience' => 'test-audience',
            'kid' => $kid,
        ];
    }
}
