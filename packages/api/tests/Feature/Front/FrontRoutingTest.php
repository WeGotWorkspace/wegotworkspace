<?php

declare(strict_types=1);

namespace Tests\Feature\Front;

use App\Support\AppPaths;
use Tests\TestCase;

final class FrontRoutingTest extends TestCase
{
    public function test_uninstalled_webdav_returns_503_from_laravel_route(): void
    {
        $data = sys_get_temp_dir().'/wgw-front-'.uniqid('', true);
        mkdir($data, 0775, true);
        config(['wgw.data_dir' => $data]);
        $this->app->forgetInstance(AppPaths::class);

        $this->call('PROPFIND', '/', [], [], [], ['HTTP_ACCEPT' => '*/*'])
            ->assertStatus(503)
            ->assertHeader('Content-Type', 'text/plain; charset=utf-8');
    }

    public function test_api_health_still_served_by_api_routes(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }
}
