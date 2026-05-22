<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Support\AppPaths;
use App\Support\WgwInstallConfig;

/**
 * Copies minimal install/shell dist trees for front routing tests (no pnpm build required).
 */
final class UiDistFixture
{
    /**
     * @return string Monorepo root with apps/wegotworkspace and packages/apps module dist trees
     */
    public static function bootstrapMonorepoLayout(?string $dataDir = null): string
    {
        $repo = sys_get_temp_dir().'/wgw-ui-repo-'.uniqid('', true);
        $installRoot = $repo.'/apps/wegotworkspace';
        mkdir($installRoot, 0775, true);
        if ($dataDir !== null) {
            mkdir($dataDir, 0775, true);
        } else {
            $dataDir = $installRoot.'/wgw-content';
            mkdir($dataDir, 0775, true);
        }

        self::copyTree(
            dirname(__DIR__).'/fixtures/ui-dist/install',
            $repo.'/packages/apps/install/dist',
        );
        self::copyTree(
            dirname(__DIR__).'/fixtures/ui-dist/shell',
            $repo.'/packages/apps/shell/dist',
        );

        putenv('WGW_APP_ROOT='.$installRoot);
        $_ENV['WGW_APP_ROOT'] = $installRoot;
        config(['wgw.data_dir' => $dataDir]);
        self::forgetBindings();

        return $repo;
    }

    public static function forgetBindings(): void
    {
        if (! function_exists('app')) {
            return;
        }
        app()->forgetInstance(WgwInstallConfig::class);
        app()->forgetInstance(AppPaths::class);
    }

    public static function removeTree(string $root): void
    {
        if ($root === '' || ! is_dir($root)) {
            return;
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($iterator as $item) {
            if ($item->isDir()) {
                rmdir($item->getPathname());
            } else {
                unlink($item->getPathname());
            }
        }
        rmdir($root);
    }

    private static function copyTree(string $from, string $to): void
    {
        if (! is_dir($from)) {
            throw new \RuntimeException('Missing UI dist fixture: '.$from);
        }
        mkdir($to, 0775, true);
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
