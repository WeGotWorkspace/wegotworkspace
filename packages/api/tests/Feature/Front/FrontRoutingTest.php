<?php

declare(strict_types=1);

namespace Tests\Feature\Front;

use Tests\Support\UiDistFixture;
use Tests\TestCase;

final class FrontRoutingTest extends TestCase
{
    private ?string $repoRoot = null;

    protected function tearDown(): void
    {
        if ($this->repoRoot !== null) {
            UiDistFixture::removeTree($this->repoRoot);
            $this->repoRoot = null;
        }
        parent::tearDown();
    }

    public function test_install_without_trailing_slash_serves_wizard(): void
    {
        $data = sys_get_temp_dir().'/wgw-front-'.uniqid('', true);
        $this->repoRoot = UiDistFixture::bootstrapMonorepoLayout($data);

        $this->get('/install')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=utf-8');
    }

    public function test_uninstalled_root_redirects_to_install(): void
    {
        $data = sys_get_temp_dir().'/wgw-front-'.uniqid('', true);
        $this->repoRoot = UiDistFixture::bootstrapMonorepoLayout($data);

        $this->get('/')
            ->assertRedirect('/install/');
    }

    public function test_uninstalled_webdav_returns_503_from_laravel_route(): void
    {
        $data = sys_get_temp_dir().'/wgw-front-'.uniqid('', true);
        $this->repoRoot = UiDistFixture::bootstrapMonorepoLayout($data);

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

    public function test_api_docs_not_handled_by_webdav_catch_all(): void
    {
        $this->get('/api/docs')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=utf-8');

        $this->get('/api/docs/')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=utf-8');
    }

    public function test_openapi_json_is_served(): void
    {
        $this->getJson('/api/openapi.json')
            ->assertOk()
            ->assertJsonPath('openapi', '3.1.0');
    }

    public function test_swagger_css_has_stylesheet_mime_type(): void
    {
        $this->get('/api/docs/swagger-ui.css')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/css; charset=utf-8');
    }
}
