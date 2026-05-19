<?php

declare(strict_types=1);

namespace Tests\Unit\Ui;

use App\Ui\UiStaticServer;
use PHPUnit\Framework\TestCase;

final class UiStaticServerTest extends TestCase
{
    public function test_serves_asset_and_spa_fallback(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-'.uniqid('', true);
        mkdir($dist.'/assets', 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>App</title>');
        file_put_contents($dist.'/assets/app.js', 'console.log(1);');

        $server = new UiStaticServer();
        $this->assertTrue($server->distReady($dist));
        $this->assertTrue($server->matchesShellPath('', '/drive/'));

        $_SERVER['REQUEST_METHOD'] = 'GET';

        ob_start();
        $served = $server->tryServe($dist, '', '/assets/app.js', false);
        $body = ob_get_clean();

        $this->assertTrue($served);
        $this->assertStringContainsString('console.log', $body);
    }
}
