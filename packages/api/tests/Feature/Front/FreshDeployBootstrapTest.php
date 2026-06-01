<?php

declare(strict_types=1);

namespace Tests\Feature\Front;

use PHPUnit\Framework\TestCase;

final class FreshDeployBootstrapTest extends TestCase
{
    private ?string $deployRoot = null;

    protected function tearDown(): void
    {
        if ($this->deployRoot !== null) {
            self::removeDeployTree($this->deployRoot);
            $this->deployRoot = null;
        }

        parent::tearDown();
    }

    public function test_bootstrap_seeds_env_before_laravel_on_fresh_deploy(): void
    {
        $this->deployRoot = $this->createFreshDeployRoot();
        $apiRoot = $this->deployRoot.'/packages/api';

        $this->assertFileDoesNotExist($apiRoot.'/.env');
        $this->assertFileExists($apiRoot.'/.env.example');

        $_SERVER['HTTP_HOST'] = '127.0.0.1:8080';
        $_SERVER['SERVER_PORT'] = '8080';
        $_SERVER['HTTPS'] = '';
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/install/';
        $_SERVER['SCRIPT_NAME'] = '/index.php';
        putenv('WGW_APP_ROOT='.$this->deployRoot);
        $_ENV['WGW_APP_ROOT'] = $this->deployRoot;

        ob_start();
        try {
            require $this->deployRoot.'/index.php';
            $body = (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }

        $this->assertFileExists($apiRoot.'/.env');
        $env = (string) file_get_contents($apiRoot.'/.env');
        $this->assertMatchesRegularExpression('/^APP_KEY=base64:/m', $env);
        $this->assertStringContainsString('APP_URL=http://127.0.0.1:8080', $env);
        $this->assertStringContainsString('<!doctype html>', strtolower($body));
    }

    private function createFreshDeployRoot(): string
    {
        $repoRoot = dirname(__DIR__, 5);
        $installSrc = $repoRoot.'/apps/wegotworkspace';
        $apiSrc = $repoRoot.'/packages/api';
        $root = sys_get_temp_dir().'/wgw-fresh-deploy-'.uniqid('', true);

        mkdir($root.'/bootstrap', 0775, true);
        copy($installSrc.'/index.php', $root.'/index.php');
        foreach (glob($installSrc.'/bootstrap/*.php') ?: [] as $bootstrapFile) {
            copy($bootstrapFile, $root.'/bootstrap/'.basename($bootstrapFile));
        }

        mkdir($root.'/packages/api', 0775, true);
        foreach (['vendor', 'app', 'bootstrap', 'config', 'database', 'public', 'resources', 'routes', 'storage', 'openapi'] as $dir) {
            $from = $apiSrc.'/'.$dir;
            if (! is_dir($from)) {
                continue;
            }
            symlink($from, $root.'/packages/api/'.$dir);
        }
        foreach (['artisan', 'composer.json', '.env.example'] as $file) {
            $from = $apiSrc.'/'.$file;
            if (is_file($from)) {
                copy($from, $root.'/packages/api/'.$file);
            }
        }

        mkdir($root.'/packages/apps/install/dist', 0775, true);
        self::copyTree(
            dirname(__DIR__, 2).'/fixtures/ui-dist/install',
            $root.'/packages/apps/install/dist',
        );

        return $root;
    }

    private static function removeDeployTree(string $root): void
    {
        if ($root === '' || ! is_dir($root)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($iterator as $item) {
            if ($item->isLink() || $item->isFile()) {
                unlink($item->getPathname());
            } else {
                rmdir($item->getPathname());
            }
        }
        rmdir($root);
    }

    private static function copyTree(string $from, string $to): void
    {
        if (! is_dir($to)) {
            mkdir($to, 0775, true);
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($from, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );
        foreach ($iterator as $item) {
            $target = $to.DIRECTORY_SEPARATOR.$iterator->getSubPathname();
            if ($item->isDir()) {
                mkdir($target, 0775, true);
            } else {
                copy($item->getPathname(), $target);
            }
        }
    }
}
