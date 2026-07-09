<?php

declare(strict_types=1);

namespace Tests\Feature\Ui;

use Tests\Support\UiDistFixture;
use Tests\Support\WgwInstallFixture;
use Tests\TestCase;

final class UiStaticFrontTest extends TestCase
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

    public function test_uninstalled_shell_path_redirects_to_install(): void
    {
        $data = sys_get_temp_dir().'/wgw-ui-kernel-'.uniqid('', true);
        $this->repoRoot = UiDistFixture::bootstrapMonorepoLayout($data);

        $this->get('/mail')
            ->assertRedirect('/install/');
    }

    public function test_uninstalled_root_assets_served_from_install_dist_when_built(): void
    {
        $data = sys_get_temp_dir().'/wgw-ui-kernel-'.uniqid('', true);
        $this->repoRoot = UiDistFixture::bootstrapMonorepoLayout($data);

        $this->get('/assets/index-DBoOAm4k.css')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/css; charset=utf-8');
    }

    public function test_install_path_shows_dist_missing_when_not_built(): void
    {
        $root = sys_get_temp_dir().'/wgw-ui-kernel-'.uniqid('', true);
        mkdir($root, 0775, true);
        mkdir($root.'/wgw-content', 0775, true);
        WgwInstallFixture::bindInstallRoot($root, $root.'/wgw-content');

        $this->get('/install/')
            ->assertStatus(503)
            ->assertSee('UI build missing', false);
    }
}
