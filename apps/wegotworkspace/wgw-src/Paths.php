<?php

declare(strict_types=1);

namespace App;

final class Paths
{
    /** @var array<string, mixed>|null */
    private static ?array $fileConfigCache = null;

    /**
     * App root (contains index.php, composer.json, wgw-src/, vendor/).
     */
    public static function appRoot(): string
    {
        return dirname(__DIR__);
    }

    /**
     * Runtime root (contains index.php, wgw-modules/, wgw-content/, wgw-config.php by default).
     * Can still be moved under a build folder with SABRE_BUILD_DIR.
     */
    public static function root(): string
    {
        $buildDir = self::envString('SABRE_BUILD_DIR');
        if ($buildDir === null || $buildDir === '') {
            return self::appRoot();
        }

        return self::resolvePathFrom(self::appRoot(), $buildDir);
    }

    public static function publicDirName(): string
    {
        return self::envSegment('SABRE_PUBLIC_DIR_NAME', '.');
    }

    public static function privateDirName(): string
    {
        return self::envSegment('SABRE_PRIVATE_DIR_NAME', 'wgw-modules');
    }

    public static function dataDirName(): string
    {
        return self::envSegment('SABRE_DATA_DIR_NAME', 'wgw-content');
    }

    public static function publicDir(): string
    {
        return self::root().'/'.self::publicDirName();
    }

    /**
     * Private application tree (never web-served; blocked in app-root .htaccess).
     */
    public static function privateDir(): string
    {
        return self::root().'/'.self::privateDirName();
    }

    public static function data(): string
    {
        $override = self::envString('SABRE_DATA_DIR');
        if ($override !== null && $override !== '') {
            return self::resolvePathFrom(self::root(), $override);
        }

        $configured = self::fileConfigString('data_dir');
        if ($configured !== null) {
            return self::resolvePathFrom(self::root(), $configured);
        }

        return self::root().'/'.self::dataDirName();
    }

    public static function configDir(): string
    {
        return self::root();
    }

    public static function resources(): string
    {
        $candidates = [
            self::root().'/wgw-src',
            self::appRoot().'/wgw-src',
            // Legacy layout fallback.
            self::root().'/resources',
            self::appRoot().'/resources',
        ];
        foreach ($candidates as $candidate) {
            if (is_dir($candidate)) {
                return $candidate;
            }
        }

        return self::appRoot().'/wgw-src';
    }

    /**
     * Next.js static export for ZIZIYI Office (packages/docs), served at {@code /office/}.
     */
    public static function officeUiBuild(): string
    {
        return self::privateDir().'/docs/build';
    }

    /**
     * Drive UI build from {@code packages/drive-ui/}, served at {@code /drive/} when present.
     */
    public static function driveDist(): string
    {
        return self::privateDir().'/drive/dist';
    }

    /**
     * Aura Voice UI build from {@code packages/voice-ui/}, static files for {@code /voice/} when present.
     */
    public static function voiceDist(): string
    {
        return self::privateDir().'/voice/dist';
    }

    /**
     * Mail (Inkmail) UI build from {@code packages/mail-ui/}, served at {@code /mail/} when present.
     */
    public static function mailDist(): string
    {
        return self::privateDir().'/mail/dist';
    }

    /**
     * Admin UI build from {@code packages/admin-ui/}, served at {@code /admin/} when present.
     */
    public static function adminDist(): string
    {
        return self::privateDir().'/admin/dist';
    }

    /**
     * User Settings UI build from {@code packages/user-settings-ui/}, served at {@code /settings/} when present.
     */
    public static function userSettingsDist(): string
    {
        return self::privateDir().'/settings/dist';
    }

    /**
     * Install UI build from {@code packages/install-ui/}, served at {@code /install/} when present.
     */
    public static function installDist(): string
    {
        return self::privateDir().'/install/dist';
    }

    /**
     * Writable FileGator state: logs, tmp, sessions, {@code users.json}, CSRF secret.
     */
    public static function filegatorData(): string
    {
        return self::data().'/filegator';
    }

    public static function lockFile(): string
    {
        return self::data().'/.installed';
    }

    public static function updateDir(): string
    {
        return self::data().'/updates';
    }

    public static function updateMaintenanceFile(): string
    {
        return self::updateDir().'/.maintenance';
    }

    public static function updateLockFile(): string
    {
        return self::updateDir().'/update.lock';
    }

    public static function localConfig(): string
    {
        $primary = self::configDir().'/wgw-config.php';
        if (is_file($primary)) {
            return $primary;
        }

        $legacy = self::root().'/config/local.php';
        if (is_file($legacy)) {
            return $legacy;
        }

        return $primary;
    }

    /**
     * Preferred value for pdo.sqlite_file in wgw-config.php.
     * Returns a project-relative path when possible.
     */
    public static function defaultSqliteFileSetting(): string
    {
        $candidate = self::data().'/db.sqlite';
        $relative = self::tryRelativeToRoot($candidate);
        if ($relative !== null) {
            return $relative;
        }

        return $candidate;
    }

    /**
     * Resolve a path for SQLite or other project-local files.
     * Absolute paths are returned unchanged. Relative paths are taken from the runtime root
     * (repo root by default, or SABRE_BUILD_DIR when set), which keeps deploys portable.
     */
    public static function resolveProjectPath(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '') {
            return self::data().'/db.sqlite';
        }
        if (self::isAbsoluteFilesystemPath($path)) {
            return $path;
        }

        return self::resolvePathFrom(self::root(), $path);
    }

    public static function isAbsoluteFilesystemPath(string $path): bool
    {
        if ($path !== '' && $path[0] === '/') {
            return true;
        }
        if (\PHP_OS_FAMILY === 'Windows' && strlen($path) > 2 && ctype_alpha($path[0]) && ':' === $path[1]) {
            return true;
        }

        return false;
    }

    /**
     * Best-effort: turn an absolute path under the project root into a portable relative path.
     */
    public static function tryRelativeToRoot(string $absolute): ?string
    {
        $absolute = str_replace('\\', '/', $absolute);
        $root = str_replace('\\', '/', self::root());
        $prefix = $root.'/';
        if (!str_starts_with($absolute, $prefix)) {
            return null;
        }

        return substr($absolute, strlen($prefix));
    }

    private static function envString(string $name): ?string
    {
        $value = getenv($name);
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private static function envSegment(string $name, string $default): string
    {
        $value = self::envString($name);
        if ($value === null) {
            return $default;
        }
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $value)) {
            throw new \RuntimeException($name.' must be a single folder name (letters, digits, dot, underscore, hyphen).');
        }

        return $value;
    }

    private static function resolvePathFrom(string $base, string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '') {
            return rtrim(str_replace('\\', '/', $base), '/');
        }

        if (self::isAbsoluteFilesystemPath($path)) {
            return self::trimTrailingSlash(self::normalizePath($path));
        }

        $normalizedBase = self::normalizePath($base);
        $joined = rtrim($normalizedBase, '/').'/'.ltrim($path, '/');

        return self::trimTrailingSlash(self::normalizePath($joined));
    }

    private static function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $prefix = '';

        if (preg_match('/^[A-Za-z]:/', $path) === 1) {
            $prefix = substr($path, 0, 2);
            $path = substr($path, 2);
        }

        $isAbsolute = str_starts_with($path, '/');
        $parts = explode('/', $path);
        $stack = [];
        foreach ($parts as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                if ($stack !== []) {
                    array_pop($stack);
                }

                continue;
            }
            $stack[] = $part;
        }

        $normalized = ($isAbsolute ? '/' : '').implode('/', $stack);
        if ($normalized === '') {
            $normalized = $isAbsolute ? '/' : '.';
        }

        if ($prefix === '') {
            return $normalized;
        }
        if (str_starts_with($normalized, '/')) {
            return $prefix.$normalized;
        }

        return $prefix.'/'.$normalized;
    }

    private static function trimTrailingSlash(string $path): string
    {
        if ($path === '/' || preg_match('/^[A-Za-z]:\/$/', $path) === 1) {
            return $path;
        }

        return rtrim($path, '/');
    }

    private static function fileConfigString(string $key): ?string
    {
        $cfg = self::fileConfig();
        if (!isset($cfg[$key]) || !is_string($cfg[$key])) {
            return null;
        }

        $value = trim($cfg[$key]);

        return $value === '' ? null : $value;
    }

    /**
     * @return array<string, mixed>
     */
    private static function fileConfig(): array
    {
        if (self::$fileConfigCache !== null) {
            return self::$fileConfigCache;
        }

        $path = self::localConfig();
        if (!is_readable($path)) {
            self::$fileConfigCache = [];

            return self::$fileConfigCache;
        }

        try {
            $cfg = LocalConfigFile::read($path);
        } catch (\Throwable) {
            self::$fileConfigCache = [];

            return self::$fileConfigCache;
        }

        self::$fileConfigCache = $cfg;

        return self::$fileConfigCache;
    }
}
