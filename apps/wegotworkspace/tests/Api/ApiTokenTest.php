<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiToken;
use PHPUnit\Framework\TestCase;

final class ApiTokenTest extends TestCase
{
    /**
     * @return array{
     *   privateKey: string,
     *   publicKey: string,
     *   issuer: string,
     *   audience: string,
     *   kid: string
     * }
     */
    private function jwtConfig(string $kid = 'test-kid'): array
    {
        $resource = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        self::assertNotFalse($resource);

        $privatePem = '';
        $ok = openssl_pkey_export($resource, $privatePem);
        self::assertTrue($ok);
        $details = openssl_pkey_get_details($resource);
        self::assertIsArray($details);
        self::assertIsString($details['key'] ?? null);

        return [
            'privateKey' => $privatePem,
            'publicKey' => (string) $details['key'],
            'issuer' => 'test-issuer',
            'audience' => 'test-audience',
            'kid' => $kid,
        ];
    }

    public function testIssuedTokenCanBeValidated(): void
    {
        $cfg = $this->jwtConfig();
        $token = ApiToken::issue([
            'sub' => 'alice',
            'role' => 'user',
            'exp' => time() + 300,
        ], $cfg);

        $claims = ApiToken::validate($token, $cfg);
        self::assertNotNull($claims);
        self::assertSame('alice', $claims['sub']);
        self::assertSame('user', $claims['role']);
        self::assertSame('test-issuer', $claims['iss']);
        self::assertSame('test-audience', $claims['aud']);
    }

    public function testTokenValidationFailsWithWrongKid(): void
    {
        $cfgA = $this->jwtConfig('kid-a');
        $cfgB = $cfgA;
        $cfgB['kid'] = 'kid-b';

        $token = ApiToken::issue([
            'sub' => 'alice',
            'role' => 'user',
            'exp' => time() + 300,
        ], $cfgA);

        $claims = ApiToken::validate($token, $cfgB);
        self::assertNull($claims);
    }

    public function testTokenValidationFailsWhenExpired(): void
    {
        $cfg = $this->jwtConfig();
        $token = ApiToken::issue([
            'sub' => 'alice',
            'role' => 'user',
            'iat' => time() - 3600,
            'exp' => time() - 5,
        ], $cfg);

        $claims = ApiToken::validate($token, $cfg);
        self::assertNull($claims);
    }

    public function testTokenValidationFailsWithWrongAudience(): void
    {
        $cfg = $this->jwtConfig();
        $token = ApiToken::issue([
            'sub' => 'alice',
            'role' => 'user',
            'exp' => time() + 300,
        ], $cfg);

        $wrongAud = $cfg;
        $wrongAud['audience'] = 'another-audience';

        $claims = ApiToken::validate($token, $wrongAud);
        self::assertNull($claims);
    }
}
