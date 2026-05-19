<?php

declare(strict_types=1);

namespace Tests\Feature\System;

use Tests\TestCase;

final class HealthEndpointTest extends TestCase
{
    public function test_health_returns_ok_payload(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJsonStructure(['status', 'apiVersion', 'timestamp'])
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('apiVersion', 'v1');
    }
}
