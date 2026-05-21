<?php

declare(strict_types=1);

namespace App\Services\Installer;

use Symfony\Component\HttpFoundation\Response;

final class InstallerWebBase
{
    public static function detect(): string
    {
        $script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
        $script = str_replace('\\', '/', (string) $script);
        if (basename($script) !== 'index.php') {
            $script = '/index.php';
        }
        $dir = dirname($script);
        if ($dir === '/' || $dir === '.') {
            return '';
        }

        $dir = rtrim($dir, '/');
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? str_replace('\\', '/', $path) : '/';
        if ($path !== $dir && ! str_starts_with($path, $dir.'/')) {
            return '';
        }

        return $dir;
    }

    public static function baseUriFromWebBase(string $webBase): string
    {
        $webBase = trim(str_replace('\\', '/', $webBase), '/');

        return $webBase === '' ? '/' : '/'.$webBase.'/';
    }

    public static function url(string $webBase, string $path): string
    {
        $path = '/'.ltrim($path, '/');
        if ($webBase === '') {
            return $path;
        }

        return $webBase.$path;
    }

    public static function redirectToInstallWizard(): Response
    {
        $target = self::url(self::detect(), '/install/');

        return redirect($target, 302)->setContent('');
    }
}
