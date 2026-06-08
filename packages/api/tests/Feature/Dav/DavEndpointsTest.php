<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use Tests\Support\WgwDatabaseTestCase;

final class DavEndpointsTest extends WgwDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();
        $this->seedWgwUser('alice', displayName: 'Alice');
    }

    public function test_dav_capabilities_requires_auth_and_returns_flags(): void
    {
        $this->getJson('/api/v1/dav/capabilities')->assertUnauthorized();

        $token = $this->issueBearerToken();

        $this->setAppSettings([
            'base_uri' => '/dav/',
            'calendar_enabled' => false,
        ]);

        $response = $this->withBearer($token)->getJson('/api/v1/dav/capabilities');

        $response->assertOk()
            ->assertJsonPath('baseUri', '/dav/')
            ->assertJsonPath('filesEnabled', true)
            ->assertJsonPath('calendarEnabled', false)
            ->assertJsonPath('contactsEnabled', true);
    }
}
