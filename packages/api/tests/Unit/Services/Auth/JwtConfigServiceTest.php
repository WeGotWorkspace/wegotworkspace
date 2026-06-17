<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Auth;

use App\Services\Auth\JwtConfigService;
use Tests\Support\AuthTestKeys;
use Tests\TestCase;

final class JwtConfigServiceTest extends TestCase
{
    private string $installRoot;

    protected function setUp(): void
    {
        $this->installRoot = sys_get_temp_dir().'/wgw-jwt-config-test-'.uniqid('', true);
        mkdir($this->installRoot.'/wgw-content/keys', 0775, true);

        putenv('WGW_APP_ROOT='.$this->installRoot);
        $_ENV['WGW_APP_ROOT'] = $this->installRoot;

        parent::setUp();

        config(['wgw.data_dir' => $this->installRoot.'/wgw-content']);

        $keys = AuthTestKeys::rsaPair();
        file_put_contents($this->installRoot.'/wgw-content/keys/api-jwt-private.pem', $keys['private_key']);
        file_put_contents($this->installRoot.'/wgw-content/keys/api-jwt-public.pem', $keys['public_key']);
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->installRoot);

        parent::tearDown();
    }

    public function test_falls_back_to_installer_keys_when_configured_paths_are_missing(): void
    {
        config([
            'wgw.jwt.private_key_path' => '../../packages/api/storage/app/jwt/api-jwt-private.pem',
            'wgw.jwt.public_key_path' => '../../packages/api/storage/app/jwt/api-jwt-public.pem',
        ]);

        $config = $this->app->make(JwtConfigService::class)->signingConfig();

        $this->assertNotNull($config);
        $this->assertStringContainsString('BEGIN PRIVATE KEY', $config['privateKey']);
        $this->assertStringContainsString('BEGIN PUBLIC KEY', $config['publicKey']);
    }

    private function removeTree(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            if (is_dir($path)) {
                $this->removeTree($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
