<?php

declare(strict_types=1);

namespace Tests\Support;

use Tests\TestCase;

abstract class WgwDatabaseTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        WgwTestDatabase::setUpFreshSchema();
    }

    /**
     * @return array<string, string>
     */
    protected function wgwJwtConfig(): array
    {
        $keys = AuthTestKeys::rsaPair();

        return [
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ];
    }

    protected function configureWgwJwtKeys(): void
    {
        config($this->wgwJwtConfig());
    }
}
