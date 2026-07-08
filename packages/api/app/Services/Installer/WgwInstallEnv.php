<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Support\AppPaths;

/**
 * Reads {@code WGW_INSTALL_*} environment variables for wizard autofill and headless install.
 *
 * @see config/wgw.php install section
 * @see docs/install-docker.md
 */
final class WgwInstallEnv
{
    public function __construct(private AppPaths $paths) {}

    public function isHeadlessEnabled(): bool
    {
        return $this->envBool('WGW_INSTALL_HEADLESS');
    }

    /**
     * Partial wizard state merged into bootstrap/runtime responses (never includes passwords).
     *
     * @return array<string, mixed>
     */
    public function wizardDefaults(string $webBase): array
    {
        $driver = $this->normalizedDriver();
        $defaults = [
            'db_driver' => $driver,
            'db' => $this->dbDefaults($driver),
            'timezone' => $this->envString('WGW_INSTALL_TIMEZONE') ?? 'UTC',
            'base_uri' => $this->resolveBaseUri($webBase, false),
            'enable_files' => $this->envBool('WGW_INSTALL_ENABLE_FILES', true),
            'enable_calendars' => $this->envBool('WGW_INSTALL_ENABLE_CALENDARS', true),
            'enable_contacts' => $this->envBool('WGW_INSTALL_ENABLE_CONTACTS', true),
            'show_browser_ui' => $this->envBool('WGW_INSTALL_SHOW_BROWSER_UI', true),
        ];

        $username = $this->envString('WGW_INSTALL_ADMIN_USERNAME');
        if ($username !== null) {
            $defaults['admin_username'] = strtolower($username);
        }
        $email = $this->envString('WGW_INSTALL_ADMIN_EMAIL');
        if ($email !== null) {
            $defaults['admin_email'] = $email;
        }
        $display = $this->envString('WGW_INSTALL_ADMIN_DISPLAY_NAME');
        if ($display !== null) {
            $defaults['admin_display_name'] = $display;
        }

        return $defaults;
    }

    /**
     * @return array{state: array<string, mixed>, payload: array<string, mixed>}|null
     */
    public function headlessPlan(string $webBase): ?array
    {
        if (! $this->isHeadlessEnabled()) {
            return null;
        }

        $driver = $this->normalizedDriver();
        $db = $this->dbConfig($driver);
        if ($db === null) {
            return null;
        }

        $username = strtolower(trim((string) ($this->envString('WGW_INSTALL_ADMIN_USERNAME') ?? '')));
        $email = trim((string) ($this->envString('WGW_INSTALL_ADMIN_EMAIL') ?? ''));
        $password = (string) ($this->envString('WGW_INSTALL_ADMIN_PASSWORD') ?? '');
        $display = trim((string) ($this->envString('WGW_INSTALL_ADMIN_DISPLAY_NAME') ?? '')) ?: $username;

        if ($username === '' || $email === '' || strlen($password) < 10) {
            return null;
        }

        if (! preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $username)) {
            return null;
        }

        $baseUri = $this->resolveBaseUri($webBase, true);
        if ($baseUri === null) {
            return null;
        }

        return [
            'state' => [
                'db' => $db,
                'db_driver' => $driver,
                'timezone' => $this->envString('WGW_INSTALL_TIMEZONE') ?? 'UTC',
                'base_uri' => $baseUri,
                'enable_files' => $this->envBool('WGW_INSTALL_ENABLE_FILES', true),
                'enable_calendars' => $this->envBool('WGW_INSTALL_ENABLE_CALENDARS', true),
                'enable_contacts' => $this->envBool('WGW_INSTALL_ENABLE_CONTACTS', true),
                'show_browser_ui' => $this->envBool('WGW_INSTALL_SHOW_BROWSER_UI', true),
            ],
            'payload' => [
                'username' => $username,
                'display_name' => $display,
                'email' => $email,
                'password' => $password,
                'password_confirm' => $password,
                'mail_enabled' => false,
                'meet_enabled' => false,
            ],
        ];
    }

    private function normalizedDriver(): string
    {
        $driver = strtolower(trim((string) ($this->envString('WGW_INSTALL_DB_DRIVER') ?? 'sqlite')));

        return in_array($driver, ['sqlite', 'mysql'], true) ? $driver : 'sqlite';
    }

    /**
     * @return array<string, mixed>
     */
    private function dbDefaults(string $driver): array
    {
        $config = $this->dbConfig($driver);
        if ($config === null) {
            return $driver === 'mysql'
                ? []
                : ['sqlite_path' => $this->paths->defaultSqliteRelativePath()];
        }

        $out = [];
        if ($driver === 'sqlite') {
            $out['sqlite_path'] = (string) ($config['sqlite_path'] ?? $this->paths->defaultSqliteRelativePath());
        } else {
            foreach (['mysql_host', 'mysql_port', 'mysql_db', 'mysql_user'] as $key) {
                if (isset($config[$key])) {
                    $out[$key] = $config[$key];
                }
            }
        }

        return $out;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function dbConfig(string $driver): ?array
    {
        if ($driver === 'sqlite') {
            $path = $this->envString('WGW_INSTALL_DB_SQLITE_PATH');
            if ($path === null) {
                $path = $this->paths->defaultSqliteRelativePath();
            }

            return [
                'driver' => 'sqlite',
                'sqlite_path' => $path,
            ];
        }

        $host = $this->envString('WGW_INSTALL_DB_HOST');
        $database = $this->envString('WGW_INSTALL_DB_DATABASE');
        $user = $this->envString('WGW_INSTALL_DB_USER');
        $password = $this->envString('WGW_INSTALL_DB_PASSWORD');
        if ($host === null || $database === null || $user === null || $password === null) {
            return null;
        }

        $port = (int) ($this->envString('WGW_INSTALL_DB_PORT') ?? '3306');

        return [
            'driver' => 'mysql',
            'mysql_host' => $host,
            'mysql_port' => $port > 0 ? $port : 3306,
            'mysql_db' => $database,
            'mysql_user' => $user,
            'mysql_password' => $password,
        ];
    }

    private function resolveBaseUri(string $webBase, bool $requireExplicit): ?string
    {
        $explicit = $this->envString('WGW_INSTALL_BASE_URI');
        if ($explicit !== null) {
            $base = $explicit[0] === '/' ? $explicit : '/'.$explicit;

            return rtrim($base, '/').'/';
        }

        if ($this->envBool('WGW_INSTALL_BASE_URI_AUTO')) {
            $appUrl = $this->envString('APP_URL');
            if ($appUrl !== null) {
                $path = parse_url($appUrl, PHP_URL_PATH);
                if (is_string($path) && $path !== '' && $path !== '/') {
                    return rtrim($path, '/').'/';
                }
            }

            return InstallerWebBase::baseUriFromWebBase($webBase);
        }

        if ($requireExplicit) {
            return null;
        }

        return InstallerWebBase::baseUriFromWebBase($webBase);
    }

    private function envString(string $key): ?string
    {
        $value = getenv($key);
        if (! is_string($value) || $value === '') {
            $value = $_ENV[$key] ?? null;
        }
        if (! is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function envBool(string $key, bool $default = false): bool
    {
        $value = $this->envString($key);
        if ($value === null) {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOL);
    }
}
