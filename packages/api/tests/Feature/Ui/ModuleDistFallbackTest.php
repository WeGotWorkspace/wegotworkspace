<?php

declare(strict_types=1);

namespace Tests\Feature\Ui;

use App\Services\Ui\UiFrontKernel;
use App\Support\AppPaths;
use Tests\TestCase;

final class ModuleDistFallbackTest extends TestCase
{
    public function test_module_dist_is_preferred_over_shell_for_module_routes(): void
    {
        $base = sys_get_temp_dir().'/wgw-module-dist-'.uniqid('', true);
        $data = $base.'/data';
        $install = $base.'/install';
        mkdir($data, 0775, true);
        mkdir($install, 0775, true);
        file_put_contents($install.'/index.php', '<?php');
        mkdir($install.'/packages/apps/shell/dist/assets', 0775, true);
        mkdir($install.'/packages/apps/drive/dist/assets', 0775, true);
        file_put_contents($install.'/packages/apps/shell/dist/index.html', 'shell');
        file_put_contents($install.'/packages/apps/shell/dist/assets/app.js', 'shell-js');
        file_put_contents($install.'/packages/apps/drive/dist/index.html', 'drive');
        file_put_contents($install.'/packages/apps/drive/dist/assets/app.js', 'drive-js');
        file_put_contents($data.'/.installed', '1');

        putenv('WGW_APP_ROOT='.$install);
        $_ENV['WGW_APP_ROOT'] = $install;
        config(['wgw.data_dir' => $data]);
        $this->app->forgetInstance(AppPaths::class);
        $this->app->forgetInstance(\App\Support\WgwInstallConfig::class);

        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/drive/assets/app.js';
        $_SERVER['SCRIPT_NAME'] = '/index.php';

        ob_start();
        $handled = $this->app->make(UiFrontKernel::class)->tryHandle('/drive/assets/app.js');
        $body = (string) ob_get_clean();

        $this->assertTrue($handled);
        $this->assertStringContainsString('drive-js', $body);
        $this->assertStringNotContainsString('shell-js', $body);
    }
}
