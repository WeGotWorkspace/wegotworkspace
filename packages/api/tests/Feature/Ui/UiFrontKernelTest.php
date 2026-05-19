<?php

declare(strict_types=1);

namespace Tests\Feature\Ui;

use App\Support\AppPaths;
use Tests\TestCase;

final class UiFrontKernelTest extends TestCase
{
    public function test_install_path_shows_dist_missing_when_not_built(): void
    {
        $data = sys_get_temp_dir().'/wgw-ui-kernel-'.uniqid('', true);
        mkdir($data, 0775, true);
        config(['wgw.data_dir' => $data]);
        $this->app->forgetInstance(AppPaths::class);

        $this->get('/install/')
            ->assertStatus(503)
            ->assertSee('UI build missing', false);
    }
}
