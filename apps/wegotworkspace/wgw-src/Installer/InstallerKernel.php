<?php

declare(strict_types=1);

namespace App\Installer;

use App\Paths;
use App\Settings\SettingsKeys;

final class InstallerKernel
{
    private const SESSION_KEY = '_sabre_install';
    private static bool $apiMode = false;

    public static function bootstrapSession(): void
    {
        $dir = Paths::data().'/sessions';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        if (is_writable($dir)) {
            session_save_path($dir);
        }
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }

    public static function respond(): void
    {
        self::bootstrapSession();
        $webBase = WebBase::detect();
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $installed = is_file(Paths::lockFile());

        if (self::isApiPath($webBase, $path)) {
            self::respondApi($webBase, $path, $installed);

            return;
        }

        if ($installed) {
            if (InstallerStatic::distReady() && InstallerStatic::tryServe($webBase, $path)) {
                return;
            }
            self::respondAlreadyInstalledPage($webBase);
        }

        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method === 'GET' || $method === 'HEAD') {
            if (InstallerStatic::distReady() && InstallerStatic::tryServe($webBase, $path)) {
                return;
            }
            self::respondDistMissing();
        }

        if ($method === 'POST') {
            self::errorPage(405, 'Installer UI no longer accepts form posts. Use /install/api instead.');
        }

        self::errorPage(405, 'Method not allowed.');
    }

    private static function state(): array
    {
        if (!isset($_SESSION[self::SESSION_KEY]) || !is_array($_SESSION[self::SESSION_KEY])) {
            $_SESSION[self::SESSION_KEY] = ['step' => 'welcome'];
        }

        /** @var array<string, mixed> */
        return $_SESSION[self::SESSION_KEY];
    }

    private static function saveState(array $s): void
    {
        $_SESSION[self::SESSION_KEY] = $s;
    }

    private static function isApiPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/install/api');

        return $path === $prefix || str_starts_with($path, $prefix.'/');
    }

    private static function respondApi(string $webBase, string $path, bool $installed): void
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $bootstrapPath = WebBase::url($webBase, '/install/api/bootstrap');
        $actionPath = WebBase::url($webBase, '/install/api/action');

        if ($method === 'GET' && $path === $bootstrapPath) {
            echo json_encode(
                [
                    'csrf' => Csrf::token(),
                    'state' => self::apiState($webBase, $installed),
                ],
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES
            );

            return;
        }

        if ($method === 'POST' && $path === $actionPath) {
            if ($installed) {
                echo json_encode(
                    [
                        'ok' => false,
                        'error' => 'This instance is already installed.',
                        'redirect' => WebBase::url($webBase, '/admin/updates'),
                        'state' => self::apiState($webBase, true),
                    ],
                    JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES
                );

                return;
            }
            self::apiPostAction($webBase);

            return;
        }

        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Not found'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @return array<string, mixed>
     */
    private static function apiState(string $webBase, bool $installed = false): array
    {
        if ($installed) {
            return [
                'step' => 'installed',
                'flash' => null,
                'db_driver' => 'sqlite',
                'db' => [],
                'timezone' => 'UTC',
                'base_uri' => WebBase::baseUriFromWebBase($webBase),
                'enable_files' => true,
                'enable_calendars' => true,
                'enable_contacts' => true,
                'show_browser_ui' => true,
                'checks' => EnvChecker::checkAll('sqlite'),
                'already_installed' => true,
                'admin_updates_url' => WebBase::url($webBase, '/admin/updates'),
            ];
        }
        $s = self::state();
        $step = (string) ($s['step'] ?? 'welcome');
        $allowed = ['welcome', 'requirements', 'database', 'site', 'account', 'done', 'installed'];
        if (!in_array($step, $allowed, true)) {
            $step = 'welcome';
        }

        $driver = (string) ($s['db_driver'] ?? 'sqlite');
        if (!in_array($driver, ['sqlite', 'mysql'], true)) {
            $driver = 'sqlite';
        }

        $checks = EnvChecker::checkAll($driver);

        return [
            'step' => $step,
            'flash' => is_string($s['_flash'] ?? null) ? $s['_flash'] : null,
            'db_driver' => $driver,
            'db' => is_array($s['db'] ?? null) ? $s['db'] : [],
            'timezone' => (string) ($s['timezone'] ?? 'UTC'),
            'base_uri' => (string) ($s['base_uri'] ?? WebBase::baseUriFromWebBase($webBase)),
            'enable_files' => (bool) ($s['enable_files'] ?? true),
            'enable_calendars' => (bool) ($s['enable_calendars'] ?? true),
            'enable_contacts' => (bool) ($s['enable_contacts'] ?? true),
            'show_browser_ui' => (bool) ($s['show_browser_ui'] ?? true),
            'checks' => $checks,
        ];
    }

    private static function respondAlreadyInstalledPage(string $webBase): void
    {
        http_response_code(200);
        header('Content-Type: text/html; charset=utf-8');
        $updatesUrl = htmlspecialchars(WebBase::url($webBase, '/admin/updates'), ENT_QUOTES, 'UTF-8');
        echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Already installed</title></head><body>';
        echo '<h1>WeGotWorkspace is already installed</h1>';
        echo '<p>Open the admin update panel to check for new releases.</p>';
        echo '<p><a href="'.$updatesUrl.'">Open admin updates</a></p>';
        echo '</body></html>';
        exit;
    }

    private static function apiPostAction(string $webBase): void
    {
        $raw = file_get_contents('php://input');
        $payload = json_decode((string) $raw, true);
        if (!is_array($payload)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid JSON body'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

            return;
        }

        if (!Csrf::validate(isset($payload['csrf']) && is_string($payload['csrf']) ? $payload['csrf'] : null)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid security token. Refresh and try again.'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

            return;
        }

        $action = isset($payload['action']) && is_string($payload['action']) ? $payload['action'] : '';
        $body = isset($payload['payload']) && is_array($payload['payload']) ? $payload['payload'] : [];
        $result = self::applyApiAction($webBase, $action, $body);
        echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private static function applyApiAction(string $webBase, string $action, array $body): array
    {
        $_POST = [];
        $_POST['_csrf'] = Csrf::token();

        if ($action === 'welcome_next') {
            $_POST['installer_action'] = 'next';
            $s = self::state();
            $s['step'] = 'welcome';
            self::saveState($s);
        } elseif ($action === 'requirements_check') {
            $driver = isset($body['db_driver']) && is_string($body['db_driver']) ? $body['db_driver'] : 'sqlite';
            if (!in_array($driver, ['sqlite', 'mysql'], true)) {
                $driver = 'sqlite';
            }
            $s = self::state();
            $s['step'] = 'requirements';
            $s['db_driver'] = $driver;
            unset($s['_flash']);
            self::saveState($s);

            return [
                'ok' => true,
                'csrf' => Csrf::token(),
                'state' => self::apiState($webBase),
            ];
        } elseif ($action === 'requirements_next') {
            $_POST['installer_action'] = 'next';
            $_POST['db_driver'] = isset($body['db_driver']) && is_string($body['db_driver']) ? $body['db_driver'] : 'sqlite';
            $s = self::state();
            $s['step'] = 'requirements';
            self::saveState($s);
        } elseif ($action === 'database_test') {
            $_POST['db_driver'] = isset($body['db_driver']) && is_string($body['db_driver']) ? $body['db_driver'] : 'sqlite';
            $_POST['sqlite_path'] = isset($body['sqlite_path']) && is_string($body['sqlite_path']) ? $body['sqlite_path'] : '';
            $_POST['mysql_host'] = isset($body['mysql_host']) && is_string($body['mysql_host']) ? $body['mysql_host'] : '';
            $_POST['mysql_port'] = isset($body['mysql_port']) ? (string) ((int) $body['mysql_port']) : '3306';
            $_POST['mysql_db'] = isset($body['mysql_db']) && is_string($body['mysql_db']) ? $body['mysql_db'] : '';
            $_POST['mysql_user'] = isset($body['mysql_user']) && is_string($body['mysql_user']) ? $body['mysql_user'] : '';
            $_POST['mysql_password'] = isset($body['mysql_password']) && is_string($body['mysql_password']) ? $body['mysql_password'] : '';

            $db = self::readDbFromPost();
            try {
                DatabaseInstaller::testConnection($db);
            } catch (\Throwable) {
                return [
                    'ok' => false,
                    'csrf' => Csrf::token(),
                    'error' => 'Could not connect to the database. Check your settings.',
                    'state' => self::apiState($webBase),
                ];
            }
            $s = self::state();
            $s['step'] = 'database';
            $s['db_driver'] = (string) $db['driver'];
            $s['db'] = $db;
            unset($s['_flash']);
            self::saveState($s);

            return [
                'ok' => true,
                'csrf' => Csrf::token(),
                'state' => self::apiState($webBase),
            ];
        } elseif ($action === 'database_next') {
            $_POST['installer_action'] = 'next';
            $_POST['db_driver'] = isset($body['db_driver']) && is_string($body['db_driver']) ? $body['db_driver'] : 'sqlite';
            $_POST['sqlite_path'] = isset($body['sqlite_path']) && is_string($body['sqlite_path']) ? $body['sqlite_path'] : '';
            $_POST['mysql_host'] = isset($body['mysql_host']) && is_string($body['mysql_host']) ? $body['mysql_host'] : '';
            $_POST['mysql_port'] = isset($body['mysql_port']) ? (string) ((int) $body['mysql_port']) : '3306';
            $_POST['mysql_db'] = isset($body['mysql_db']) && is_string($body['mysql_db']) ? $body['mysql_db'] : '';
            $_POST['mysql_user'] = isset($body['mysql_user']) && is_string($body['mysql_user']) ? $body['mysql_user'] : '';
            $_POST['mysql_password'] = isset($body['mysql_password']) && is_string($body['mysql_password']) ? $body['mysql_password'] : '';
            $s = self::state();
            $s['step'] = 'database';
            self::saveState($s);
        } elseif ($action === 'site_next') {
            $_POST['installer_action'] = 'next';
            $_POST['base_uri_override'] = isset($body['base_uri_override']) && is_string($body['base_uri_override']) ? $body['base_uri_override'] : '';
            $_POST['timezone'] = isset($body['timezone']) && is_string($body['timezone']) ? $body['timezone'] : 'UTC';
            if (!empty($body['enable_files'])) {
                $_POST['enable_files'] = '1';
            }
            if (!empty($body['enable_calendars'])) {
                $_POST['enable_calendars'] = '1';
            }
            if (!empty($body['enable_contacts'])) {
                $_POST['enable_contacts'] = '1';
            }
            if (!empty($body['show_browser_ui'])) {
                $_POST['show_browser_ui'] = '1';
            }
            $s = self::state();
            $s['step'] = 'site';
            self::saveState($s);
        } elseif ($action === 'install') {
            $_POST['installer_action'] = 'install';
            $_POST['username'] = isset($body['username']) && is_string($body['username']) ? $body['username'] : '';
            $_POST['display_name'] = isset($body['display_name']) && is_string($body['display_name']) ? $body['display_name'] : '';
            $_POST['email'] = isset($body['email']) && is_string($body['email']) ? $body['email'] : '';
            $_POST['password'] = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
            $_POST['password_confirm'] = isset($body['password_confirm']) && is_string($body['password_confirm']) ? $body['password_confirm'] : '';
            $_POST['mail_enabled'] = !empty($body['mail_enabled']) ? '1' : '0';
            $_POST['mail_imap_host'] = isset($body['mail_imap_host']) && is_string($body['mail_imap_host']) ? $body['mail_imap_host'] : '';
            $_POST['mail_imap_port'] = isset($body['mail_imap_port']) && is_string($body['mail_imap_port']) ? $body['mail_imap_port'] : '';
            $_POST['mail_imap_security'] = isset($body['mail_imap_security']) && is_string($body['mail_imap_security']) ? $body['mail_imap_security'] : '';
            $_POST['mail_smtp_host'] = isset($body['mail_smtp_host']) && is_string($body['mail_smtp_host']) ? $body['mail_smtp_host'] : '';
            $_POST['mail_smtp_port'] = isset($body['mail_smtp_port']) && is_string($body['mail_smtp_port']) ? $body['mail_smtp_port'] : '';
            $_POST['mail_smtp_security'] = isset($body['mail_smtp_security']) && is_string($body['mail_smtp_security']) ? $body['mail_smtp_security'] : '';
            $_POST['voice_enabled'] = !empty($body['voice_enabled']) ? '1' : '0';
            $_POST['voice_turn_url'] = isset($body['voice_turn_url']) && is_string($body['voice_turn_url']) ? $body['voice_turn_url'] : '';
            $_POST['voice_turn_username'] = isset($body['voice_turn_username']) && is_string($body['voice_turn_username']) ? $body['voice_turn_username'] : '';
            $_POST['voice_turn_credential'] = isset($body['voice_turn_credential']) && is_string($body['voice_turn_credential']) ? $body['voice_turn_credential'] : '';
            $s = self::state();
            $s['step'] = 'account';
            self::saveState($s);
        } else {
            return ['ok' => false, 'csrf' => Csrf::token(), 'error' => 'Unsupported action'];
        }

        self::$apiMode = true;
        try {
            self::handlePost($webBase);

            return [
                'ok' => true,
                'csrf' => Csrf::token(),
                'state' => self::apiState($webBase),
            ];
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), '__INSTALL_REDIRECT__:')) {
                $target = substr($e->getMessage(), strlen('__INSTALL_REDIRECT__:'));

                return [
                    'ok' => true,
                    'csrf' => Csrf::token(),
                    'redirect' => $target,
                    'state' => self::apiState($webBase),
                ];
            }
            if (str_starts_with($e->getMessage(), '__INSTALL_ERROR__:')) {
                $msg = substr($e->getMessage(), strlen('__INSTALL_ERROR__:'));

                return [
                    'ok' => false,
                    'csrf' => Csrf::token(),
                    'error' => $msg,
                    'state' => self::apiState($webBase),
                ];
            }
            throw $e;
        } finally {
            self::$apiMode = false;
        }
    }

    private static function handlePost(string $webBase): void
    {
        if (!Csrf::validate($_POST['_csrf'] ?? null)) {
            self::errorPage(400, 'Invalid security token. Refresh the page and try again.');
        }

        $s = self::state();
        $action = (string) ($_POST['installer_action'] ?? '');

        if ($s['step'] === 'welcome' && $action === 'next') {
            $s['step'] = 'requirements';
            self::saveState($s);
            self::redirect($webBase);
        } elseif ($s['step'] === 'requirements' && $action === 'next') {
            $driver = (string) ($_POST['db_driver'] ?? 'sqlite');
            if (!in_array($driver, ['sqlite', 'mysql'], true)) {
                $driver = 'sqlite';
            }
            $checks = EnvChecker::checkAll($driver === 'mysql' ? 'mysql' : 'sqlite');
            if (!EnvChecker::allPassed($checks)) {
                $s['db_driver'] = $driver;
                $s['_flash'] = 'Some requirements are still not met. Fix them, reload, then continue.';
                self::saveState($s);
                self::redirect($webBase);

                return;
            }
            $s['db_driver'] = $driver;
            unset($s['_flash']);
            $s['step'] = 'database';
            self::saveState($s);
            self::redirect($webBase);
        } elseif ($s['step'] === 'database' && $action === 'next') {
            $db = self::readDbFromPost();
            $s['db'] = $db;
            $s['db_driver'] = (string) ($db['driver'] ?? 'sqlite');
            try {
                DatabaseInstaller::testConnection($db);
            } catch (\Throwable) {
                $s['_flash'] = 'Could not connect to the database. Check your settings.';
                self::saveState($s);
                self::redirect($webBase);

                return;
            }
            unset($s['_flash']);
            $s['step'] = 'site';
            self::saveState($s);
            self::redirect($webBase);
        } elseif ($s['step'] === 'site' && $action === 'next') {
            $override = trim((string) ($_POST['base_uri_override'] ?? ''));
            if ($override !== '') {
                $base = '/' === $override[0] ? $override : '/'.$override;
                $base = rtrim($base, '/').'/';
            } else {
                $base = WebBase::baseUriFromWebBase($webBase);
            }
            $s['base_uri'] = $base;
            $s['timezone'] = trim((string) ($_POST['timezone'] ?? 'UTC')) ?: 'UTC';
            $enableFiles = isset($_POST['enable_files']) && (string) $_POST['enable_files'] === '1';
            $enableCalendars = isset($_POST['enable_calendars']) && (string) $_POST['enable_calendars'] === '1';
            $enableContacts = isset($_POST['enable_contacts']) && (string) $_POST['enable_contacts'] === '1';
            if (!$enableFiles && !$enableCalendars && !$enableContacts) {
                $s['_flash'] = 'Enable at least one of WebDAV files, calendars, or contacts.';
                self::saveState($s);
                self::redirect($webBase);

                return;
            }
            $s['enable_files'] = $enableFiles;
            $s['enable_calendars'] = $enableCalendars;
            $s['enable_contacts'] = $enableContacts;
            $s['show_browser_ui'] = isset($_POST['show_browser_ui']) && (string) $_POST['show_browser_ui'] === '1';
            $s['step'] = 'account';
            self::saveState($s);
            self::redirect($webBase);
        } elseif ($s['step'] === 'account' && $action === 'install') {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'local';
            if (!Throttle::allow('install:'.$ip)) {
                $s['_flash'] = 'Too many attempts. Wait a few minutes and try again.';
                self::saveState($s);
                self::redirect($webBase);

                return;
            }
            self::runInstall($webBase, $s);
        } else {
            self::redirect($webBase);
        }
    }

    /**
     * @param array<string, mixed> $s
     */
    private static function runInstall(string $webBase, array $s): void
    {
        $username = strtolower(trim((string) ($_POST['username'] ?? '')));
        $display = trim((string) ($_POST['display_name'] ?? '')) ?: $username;
        $email = trim((string) ($_POST['email'] ?? ''));
        $pass = (string) ($_POST['password'] ?? '');
        $pass2 = (string) ($_POST['password_confirm'] ?? '');

        if (!preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $username)) {
            $s['_flash'] = 'Username must be 2–63 characters: lowercase letters, digits, underscore, or hyphen.';
            self::saveState($s);
            self::redirect($webBase);

            return;
        }
        if (strlen($pass) < 10) {
            $s['_flash'] = 'Use a password of at least 10 characters.';
            self::saveState($s);
            self::redirect($webBase);

            return;
        }
        if (!hash_equals($pass, $pass2)) {
            $s['_flash'] = 'Passwords do not match.';
            self::saveState($s);
            self::redirect($webBase);

            return;
        }
        /** @var array<string, mixed> $db */
        $db = $s['db'] ?? [];
        if ($db === []) {
            self::saveState(['step' => 'welcome', '_flash' => 'Your session expired before installation finished. Please start again.']);
            self::redirect($webBase);

            return;
        }

        $enableCalendars = (bool) ($s['enable_calendars'] ?? true);
        $enableContacts = (bool) ($s['enable_contacts'] ?? true);
        $enableFiles = (bool) ($s['enable_files'] ?? true);
        $mailEnabled = !isset($_POST['mail_enabled']) || (string) ($_POST['mail_enabled'] ?? '') === '1';
        $mailImapHost = trim((string) ($_POST['mail_imap_host'] ?? ''));
        $mailImapPort = (int) ($_POST['mail_imap_port'] ?? 993);
        $mailImapSecurity = self::normalizeMailSecurity((string) ($_POST['mail_imap_security'] ?? 'ssl'), 'ssl');
        $mailSmtpHost = trim((string) ($_POST['mail_smtp_host'] ?? ''));
        $mailSmtpPort = (int) ($_POST['mail_smtp_port'] ?? 587);
        $mailSmtpSecurity = self::normalizeMailSecurity((string) ($_POST['mail_smtp_security'] ?? 'starttls'), 'starttls');
        $voiceEnabled = isset($_POST['voice_enabled']) && (string) ($_POST['voice_enabled'] ?? '') === '1';
        $voiceTurnUrl = trim((string) ($_POST['voice_turn_url'] ?? ''));
        $voiceTurnUsername = trim((string) ($_POST['voice_turn_username'] ?? ''));
        $voiceTurnCredential = (string) ($_POST['voice_turn_credential'] ?? '');
        if ($enableFiles) {
            @mkdir(Paths::data().'/files', 0775, true);
        }

        try {
            DatabaseInstaller::installFresh(
                $db,
                $username,
                $pass,
                $display,
                $email !== '' ? $email : null,
                $enableCalendars,
                $enableContacts,
                [
                    SettingsKeys::TIMEZONE => (string) ($s['timezone'] ?? 'UTC'),
                    SettingsKeys::BASE_URI => (string) ($s['base_uri'] ?? '/'),
                    SettingsKeys::AUTH_REALM => 'SabreDAV',
                    SettingsKeys::BROWSER_PLUGIN => (bool) ($s['show_browser_ui'] ?? true),
                    SettingsKeys::FILES_ENABLED => $enableFiles,
                    SettingsKeys::CALENDAR_ENABLED => $enableCalendars,
                    SettingsKeys::CONTACTS_ENABLED => $enableContacts,
                    SettingsKeys::MAIL_ENABLED => $mailEnabled,
                    SettingsKeys::MAIL_IMAP_HOST => $mailEnabled ? $mailImapHost : '',
                    SettingsKeys::MAIL_IMAP_PORT => $mailEnabled ? $mailImapPort : 993,
                    SettingsKeys::MAIL_IMAP_SECURITY => $mailEnabled ? $mailImapSecurity : '',
                    SettingsKeys::MAIL_SMTP_HOST => $mailEnabled ? $mailSmtpHost : '',
                    SettingsKeys::MAIL_SMTP_PORT => $mailEnabled ? $mailSmtpPort : 587,
                    SettingsKeys::MAIL_SMTP_SECURITY => $mailEnabled ? $mailSmtpSecurity : '',
                    SettingsKeys::VOICE_TURN_URL => $voiceEnabled ? $voiceTurnUrl : '',
                    SettingsKeys::VOICE_TURN_USERNAME => $voiceEnabled ? $voiceTurnUsername : '',
                    SettingsKeys::VOICE_TURN_CREDENTIAL => $voiceEnabled ? $voiceTurnCredential : '',
                ],
            );
        } catch (\Throwable $e) {
            error_log('[wegotworkspace] '.$e->getMessage());
            $s['_flash'] = 'Installation failed. Check server logs; if you use MySQL, use an empty database.';
            self::saveState($s);
            self::redirect($webBase);

            return;
        }

        $pdoExport = self::pdoConfigForWrite($db);
        $dataDir = Paths::tryRelativeToRoot(Paths::data()) ?? Paths::data();
        $bootstrap = [
            'data_dir' => $dataDir,
            'pdo' => $pdoExport,
        ];

        try {
            // Always sync bootstrap config to the selected DB target so reinstalls cannot keep stale pdo paths.
            ConfigWriter::writeBootstrap($bootstrap);
        } catch (\Throwable $e) {
            error_log('[wegotworkspace] '.$e->getMessage());
            $s['_flash'] = 'Could not write configuration file.';
            self::saveState($s);
            self::redirect($webBase);

            return;
        }

        if (file_put_contents(Paths::lockFile(), date('c')."\n", LOCK_EX) === false) {
            $s['_flash'] = 'Database was set up but the install lock file could not be written.';
            self::saveState($s);
            self::redirect($webBase);

            return;
        }
        @chmod(Paths::lockFile(), 0600);

        session_regenerate_id(true);
        $_SESSION[self::SESSION_KEY] = [
            'step' => 'done',
            'installed_base_uri' => (string) ($s['base_uri'] ?? '/'),
            'show_browser_ui' => (bool) ($s['show_browser_ui'] ?? true),
            'enable_files' => $enableFiles,
            'enable_calendars' => $enableCalendars,
            'enable_contacts' => $enableContacts,
        ];
        $_SESSION['_install_done'] = true;
        $_SESSION['_csrf'] = bin2hex(random_bytes(32));

        $adminUrl = WebBase::url($webBase, '/admin/');
        if (self::$apiMode) {
            throw new \RuntimeException('__INSTALL_REDIRECT__:'.$adminUrl);
        }
        header('Location: '.$adminUrl, true, 302);
        exit;
    }

    /**
     * @param array<string, mixed> $db
     *
     * @return array<string, mixed>
     */
    private static function pdoConfigForWrite(array $db): array
    {
        if (($db['driver'] ?? '') === 'sqlite') {
            $abs = Paths::resolveProjectPath((string) ($db['sqlite_path'] ?? Paths::defaultSqliteFileSetting()));
            $rel = Paths::tryRelativeToRoot($abs);
            if ($rel !== null) {
                return [
                    'sqlite_file' => $rel,
                    'user' => null,
                    'password' => null,
                ];
            }

            return [
                'dsn' => 'sqlite:'.$abs,
                'user' => null,
                'password' => null,
            ];
        }

        $host = $db['mysql_host'] ?? '127.0.0.1';
        $port = (int) ($db['mysql_port'] ?? 3306);
        $name = $db['mysql_db'] ?? '';
        $user = $db['mysql_user'] ?? '';
        $pass = $db['mysql_password'] ?? '';
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name);

        return [
            'dsn' => $dsn,
            'user' => $user,
            'password' => $pass,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function readDbFromPost(): array
    {
        $driver = (string) ($_POST['db_driver'] ?? 'sqlite');
        if (!in_array($driver, ['sqlite', 'mysql'], true)) {
            $driver = 'sqlite';
        }
        if ($driver === 'sqlite') {
            $path = trim((string) ($_POST['sqlite_path'] ?? ''));
            if ($path === '') {
                $path = Paths::defaultSqliteFileSetting();
            }

            return [
                'driver' => 'sqlite',
                'sqlite_path' => $path,
            ];
        }

        return [
            'driver' => 'mysql',
            'mysql_host' => trim((string) ($_POST['mysql_host'] ?? '127.0.0.1')),
            'mysql_port' => (int) ($_POST['mysql_port'] ?? 3306),
            'mysql_db' => trim((string) ($_POST['mysql_db'] ?? '')),
            'mysql_user' => trim((string) ($_POST['mysql_user'] ?? '')),
            'mysql_password' => (string) ($_POST['mysql_password'] ?? ''),
        ];
    }

    private static function normalizeMailSecurity(string $value, string $fallback): string
    {
        $normalized = strtolower(trim($value));

        if (in_array($normalized, ['ssl', 'starttls', 'none'], true)) {
            return $normalized;
        }

        return $fallback;
    }

    private static function redirect(string $webBase): void
    {
        $target = WebBase::url($webBase, '/install/');
        if (self::$apiMode) {
            throw new \RuntimeException('__INSTALL_REDIRECT__:'.$target);
        }
        header('Location: '.$target, true, 302);
        exit;
    }

    private static function respondDistMissing(): void
    {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Install UI build is missing. Run `pnpm --filter @wgw/install-ui build` from the repo root.\n";
        exit;
    }

    private static function errorPage(int $code, string $msg): void
    {
        if (self::$apiMode) {
            throw new \RuntimeException('__INSTALL_ERROR__:'.$msg);
        }
        http_response_code($code);
        header('Content-Type: text/plain; charset=utf-8');
        echo $msg;
        exit;
    }
}
