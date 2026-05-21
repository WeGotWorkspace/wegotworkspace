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

        $response = $server->tryServe($dist, '', '/assets/app.js', false);
        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertInstanceOf(\Symfony\Component\HttpFoundation\BinaryFileResponse::class, $response);
        $file = $response->getFile();
        $this->assertNotNull($file);
        $this->assertStringContainsString('console.log', (string) file_get_contents($file->getPathname()));
    }

    public function test_resolve_route_prefix_prefers_install_over_root(): void
    {
        $server = new UiStaticServer();
        $prefixes = [
            '/',
            '/install',
        ];

        $this->assertSame('/install', $server->resolveRoutePrefix('', '/install/assets/app.js', $prefixes));
        $this->assertSame('/', $server->resolveRoutePrefix('', '/', $prefixes));
        $this->assertNull($server->resolveRoutePrefix('', '/mail/inbox', $prefixes));
    }

    public function test_serves_install_scoped_assets(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-install-'.uniqid('', true);
        mkdir($dist.'/assets', 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>Install</title>');
        file_put_contents($dist.'/assets/app.js', 'window.__install = true;');

        $server = new UiStaticServer();
        $response = $server->tryServe($dist, '', '/install/assets/app.js', false);

        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('application/javascript; charset=utf-8', $response->headers->get('Content-Type'));
    }
}
