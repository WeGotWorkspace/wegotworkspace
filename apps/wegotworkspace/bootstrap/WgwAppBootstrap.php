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
        require_once __DIR__.'/WgwSafePath.php';

        $normalized = rtrim(str_replace('\\', '/', $appRoot), '/');
        $installCandidates = [
            $appRoot.'/packages/api',
            $runtimeRoot.'/packages/api',
        ];

        // Monorepo dev only: live packages/api beside apps/wegotworkspace.
        if (str_ends_with($normalized, '/apps/wegotworkspace')) {
            return array_values(array_unique([
                dirname($normalized, 2).'/packages/api',
                ...$installCandidates,
            ]));
        }

        return array_values(array_unique($installCandidates));
    }

    private static function resolveApiPackageRoot(string $appRoot, string $runtimeRoot): ?string
    {
        require_once __DIR__.'/WgwSafePath.php';

        foreach (self::apiPackageCandidates($appRoot, $runtimeRoot) as $candidate) {
            if (! WgwSafePath::isFile($candidate.'/public/index.php')) {
                continue;
            }
            if (WgwSafePath::isFile($candidate.'/vendor/autoload.php')) {
                return $candidate;
            }
        }

        return null;
    }

    private static function findApiPackageWithoutVendor(string $appRoot, string $runtimeRoot): ?string
    {
        require_once __DIR__.'/WgwSafePath.php';

        foreach (self::apiPackageCandidates($appRoot, $runtimeRoot) as $candidate) {
            if (WgwSafePath::isFile($candidate.'/public/index.php')) {
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
                'message' => 'Composer vendor/ is missing for the API app. Run `composer --working-dir packages/api install` from the repo root (monorepo dev), or `pnpm dev:preview` / `pnpm --filter @wgw/api build` for a self-contained install tree.',
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
