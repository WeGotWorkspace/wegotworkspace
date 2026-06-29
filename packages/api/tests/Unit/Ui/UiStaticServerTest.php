<?php

declare(strict_types=1);

namespace Tests\Unit\Ui;

use App\Ui\UiStaticServer;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class UiStaticServerTest extends TestCase
{
    public function test_serves_asset_and_spa_fallback(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-'.uniqid('', true);
        mkdir($dist.'/assets', 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>App</title>');
        file_put_contents($dist.'/assets/app.js', 'console.log(1);');

        $server = new UiStaticServer;
        $this->assertTrue($server->distReady($dist));
        $this->assertTrue($server->matchesShellPath('', '/drive/'));
        $this->assertTrue($server->matchesShellPath('', '/contacts/'));
        $this->assertTrue($server->matchesShellPath('', '/docs'));

        $response = $server->tryServe($dist, '', '/assets/app.js', false);
        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertInstanceOf(BinaryFileResponse::class, $response);
        $file = $response->getFile();
        $this->assertNotNull($file);
        $this->assertStringContainsString('console.log', (string) file_get_contents($file->getPathname()));
    }

    public function test_share_recipient_deep_links_resolve_to_shell(): void
    {
        $server = new UiStaticServer;

        $this->assertTrue($server->matchesShellPath('', '/s'));
        $this->assertTrue($server->matchesShellPath('', '/s/'));
        $this->assertTrue($server->matchesShellPath('', '/s/abc123token'));
        $this->assertTrue($server->matchesShellPath('', '/s/abc123token/folder/file.txt'));
    }

    public function test_share_prefix_does_not_swallow_sibling_segments(): void
    {
        $server = new UiStaticServer;

        $this->assertFalse($server->matchesShellPath('', '/search'));
        $this->assertFalse($server->matchesShellPath('', '/share'));
        $this->assertSame('/s', $server->resolveRoutePrefix('', '/s/token', ['/', '/s', '/settings']));
        $this->assertSame('/settings', $server->resolveRoutePrefix('', '/settings/profile', ['/', '/s', '/settings']));
        $this->assertNull($server->resolveRoutePrefix('', '/search', ['/', '/s', '/settings']));
    }

    public function test_share_recipient_deep_link_serves_spa_shell(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-share-'.uniqid('', true);
        mkdir($dist, 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>App</title>');

        $server = new UiStaticServer;
        $response = $server->tryServe($dist, '', '/s/abc123token', true);

        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('text/html; charset=utf-8', $response->headers->get('Content-Type'));
    }

    public function test_resolve_route_prefix_prefers_install_over_root(): void
    {
        $server = new UiStaticServer;
        $prefixes = [
            '/',
            '/install',
        ];

        $this->assertSame('/install', $server->resolveRoutePrefix('', '/install/assets/app.js', $prefixes));
        $this->assertSame('/', $server->resolveRoutePrefix('', '/', $prefixes));
        $this->assertNull($server->resolveRoutePrefix('', '/mail/inbox', $prefixes));
    }

    public function test_serves_service_worker_at_site_root(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-sw-'.uniqid('', true);
        mkdir($dist, 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>App</title>');
        file_put_contents($dist.'/sw.js', 'self.addEventListener("install", () => self.skipWaiting());');

        $server = new UiStaticServer;
        $response = $server->tryServe($dist, '', '/sw.js', false);

        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('application/javascript; charset=utf-8', $response->headers->get('Content-Type'));
    }

    public function test_serves_workbox_runtime_at_site_root(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-workbox-'.uniqid('', true);
        mkdir($dist, 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>App</title>');
        file_put_contents($dist.'/workbox-deadbeef.js', 'self.__WB_MANIFEST=[];');

        $server = new UiStaticServer;
        $response = $server->tryServe($dist, '', '/workbox-deadbeef.js', false);

        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_serves_install_scoped_assets(): void
    {
        $dist = sys_get_temp_dir().'/wgw-static-install-'.uniqid('', true);
        mkdir($dist.'/assets', 0775, true);
        file_put_contents($dist.'/index.html', '<!doctype html><title>Install</title>');
        file_put_contents($dist.'/assets/app.js', 'window.__install = true;');

        $server = new UiStaticServer;
        $response = $server->tryServe($dist, '', '/install/assets/app.js', false);

        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('application/javascript; charset=utf-8', $response->headers->get('Content-Type'));
    }
}
