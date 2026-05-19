<?php

declare(strict_types=1);

namespace Tests\Feature\Ui;

use App\Services\Ui\UiFrontKernel;
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

        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/install/';
        $_SERVER['SCRIPT_NAME'] = '/index.php';

        ob_start();
        $handled = $this->app->make(UiFrontKernel::class)->tryHandle('/install/');
        $body = (string) ob_get_clean();

        $this->assertTrue($handled);
        $this->assertStringContainsString('UI build missing', $body);
    }
}
