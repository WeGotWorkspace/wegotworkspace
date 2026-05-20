<?php

declare(strict_types=1);

/**
 * Install/runtime path resolution before Laravel boots.
 *
 * UI, REST, and WebDAV are handled inside packages/api once public/index.php loads.
 */
final class WgwAppBootstrap
{
    public static function run(string $appRoot): void
    {
        self::seedAppRootEnv($appRoot);

        $runtimeRoot = self::resolveRuntimeRoot($appRoot);
        $apiPackageRoot = self::resolveApiPackageRoot($appRoot, $runtimeRoot);

        if ($apiPackageRoot !== null) {
            require $apiPackageRoot.'/public/index.php';

            return;
        }

        self::respondApiUnavailable(self::findApiPackageWithoutVendor($appRoot, $runtimeRoot));
    }

    private static function seedAppRootEnv(string $appRoot): void
    {
        if (is_string(getenv('WGW_APP_ROOT')) && trim((string) getenv('WGW_APP_ROOT')) !== '') {
            return;
        }

        putenv('WGW_APP_ROOT='.$appRoot);
        $_ENV['WGW_APP_ROOT'] = $appRoot;
    }

    private static function resolveRuntimeRoot(string $appRoot): string
    {
        $buildDir = getenv('SABRE_BUILD_DIR');
        if (! is_string($buildDir) || trim($buildDir) === '') {
            return $appRoot;
        }

        $buildDir = trim(str_replace('\\', '/', $buildDir));

        if ($buildDir[0] === '/') {
            return rtrim($buildDir, '/');
        }

        if (str_contains($buildDir, '..')) {
            header('Content-Type: text/plain; charset=utf-8');
            http_response_code(500);
            echo "Invalid SABRE_BUILD_DIR (must not contain '..').\n";
            exit;
        }

        return rtrim($appRoot, '/').'/'.ltrim($buildDir, '/');
    }

    /**
     * @return list<string>
     */
    private static function apiPackageCandidates(string $appRoot, string $runtimeRoot): array
    {
        return [
            $runtimeRoot.'/packages/api',
            $appRoot.'/packages/api',
            dirname($appRoot, 2).'/packages/api',
        ];
    }

    private static function resolveApiPackageRoot(string $appRoot, string $runtimeRoot): ?string
    {
        foreach (self::apiPackageCandidates($appRoot, $runtimeRoot) as $candidate) {
            if (! is_file($candidate.'/public/index.php')) {
                continue;
            }
            if (is_file($candidate.'/vendor/autoload.php')) {
                return $candidate;
            }
        }

        return null;
    }

    private static function findApiPackageWithoutVendor(string $appRoot, string $runtimeRoot): ?string
    {
        foreach (self::apiPackageCandidates($appRoot, $runtimeRoot) as $candidate) {
            if (is_file($candidate.'/public/index.php')) {
                return $candidate;
            }
        }

        return null;
    }

    private static function respondApiUnavailable(?string $apiPackageWithoutVendor): void
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);

        if ($apiPackageWithoutVendor !== null) {
            echo json_encode([
                'error' => 'api_unavailable',
                'message' => 'Composer vendor/ is missing for the API package. Run `composer --working-dir packages/api install` from the repo root (monorepo dev), or `pnpm --filter @wgw/api build` to sync a runtime copy with vendor.',
                'path' => $apiPackageWithoutVendor,
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'error' => 'api_unavailable',
                'message' => 'packages/api Laravel runtime is missing.',
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        exit;
    }
}
