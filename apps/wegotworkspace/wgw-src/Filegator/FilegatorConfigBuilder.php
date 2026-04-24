<?php

declare(strict_types=1);

namespace App\Filegator;

use App\Config;
use App\Installer\WebBase;
use App\LocalConfigFile;
use App\Paths;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;
use League\Flysystem\WebDAV\WebDAVAdapter;
use Sabre\DAV\Client;
use Sabre\HTTP\Auth\Basic;
use Sabre\HTTP\Response;
use Sabre\HTTP\Sapi;

/**
 * Builds the configuration array expected by {@see \Filegator\Config\Config}.
 */
final class FilegatorConfigBuilder
{
    /**
     * @return array<string, mixed>
     */
    public static function build(string $webBase): array
    {
        $publicPath = WebBase::url($webBase, '/drive/');
        $data = Paths::filegatorData();
        $logs = $data.'/logs';
        $sessions = $data.'/sessions';
        $csrfFile = $data.'/csrf_secret.txt';

        return [
            'public_path' => $publicPath,
            'public_dir' => Paths::driveDist(),
            'timezone' => 'UTC',
            'overwrite_on_upload' => false,
            /** Served with {@code Content-Disposition: inline} so Drive grid thumbnails load in {@code <img>}. */
            'download_inline' => ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'],
            'frontend_config' => [
                'upload_max_size' => 100 * 1024 * 1024,
                /** Hints for clients; keep in sync with Drive UI chunk size (see {@code filegatorApi.ts}). */
                'upload_chunk_size' => 256 * 1024,
            ],
            'services' => [
                'Filegator\Services\Logger\LoggerInterface' => [
                    'handler' => \Filegator\Services\Logger\Adapters\MonoLogger::class,
                    'config' => [
                        'monolog_handlers' => [
                            static function () use ($logs): \Monolog\Handler\StreamHandler {
                                return new \Monolog\Handler\StreamHandler(
                                    $logs.'/app.log',
                                    \Monolog\Logger::DEBUG
                                );
                            },
                        ],
                    ],
                ],
                'Filegator\Services\Session\SessionStorageInterface' => [
                    'handler' => \Filegator\Services\Session\Adapters\SessionStorage::class,
                    'config' => [
                        'handler' => static function () use ($webBase, $sessions): \Symfony\Component\HttpFoundation\Session\Storage\NativeSessionStorage {
                            $cookiePath = WebBase::url($webBase, '/drive/');
                            if ($cookiePath === '') {
                                $cookiePath = '/drive/';
                            }
                            $handler = new \Symfony\Component\HttpFoundation\Session\Storage\Handler\NativeFileSessionHandler($sessions);

                            return new \Symfony\Component\HttpFoundation\Session\Storage\NativeSessionStorage([
                                'name' => 'FGSSID',
                                'cookie_path' => $cookiePath,
                                'cookie_samesite' => 'Lax',
                                'cookie_secure' => null,
                                'cookie_httponly' => true,
                            ], $handler);
                        },
                    ],
                ],
                'Filegator\Services\Cors\Cors' => [
                    'handler' => \Filegator\Services\Cors\Cors::class,
                    'config' => [
                        'enabled' => false,
                    ],
                ],
                'Filegator\Services\Tmpfs\TmpfsInterface' => [
                    'handler' => \Filegator\Services\Tmpfs\Adapters\Tmpfs::class,
                    'config' => [
                        'path' => $data.'/tmp/',
                        'gc_probability_perc' => 10,
                        'gc_older_than' => 60 * 60 * 24 * 2,
                    ],
                ],
                'Filegator\Services\Security\Security' => [
                    'handler' => \Filegator\Services\Security\Security::class,
                    'config' => [
                        'csrf_protection' => true,
                        'csrf_key' => self::csrfSecret($csrfFile),
                        'ip_allowlist' => [],
                        'ip_denylist' => [],
                        'allow_insecure_overlays' => false,
                    ],
                ],
                'Filegator\Services\Storage\Filesystem' => [
                    'handler' => \Filegator\Services\Storage\Filesystem::class,
                    'config' => [
                        'separator' => '/',
                        'config' => [],
                        'adapter' => static function (): \League\Flysystem\Adapter\AbstractAdapter {
                            $local = [];
                            $lp = Paths::localConfig();
                            if (is_readable($lp)) {
                                $local = LocalConfigFile::read($lp);
                            }
                            $fg = isset($local['filegator']) && is_array($local['filegator']) ? $local['filegator'] : [];
                            if (($fg['storage'] ?? 'local') === 'webdav') {
                                $base = rtrim((string) ($fg['webdav_base_uri'] ?? ''), '/').'/';
                                $client = new Client([
                                    'baseUri' => $base,
                                    'userName' => (string) ($fg['webdav_username'] ?? ''),
                                    'password' => (string) ($fg['webdav_password'] ?? ''),
                                ]);
                                $p = isset($fg['webdav_path_prefix']) ? trim((string) $fg['webdav_path_prefix'], '/') : '';

                                return new WebDAVAdapter($client, $p === '' ? null : $p);
                            }

                            $filesRoot = Paths::data().'/files';
                            $pdoCfg = Config::pdoCredentials(Config::load());
                            $pdo = new \PDO(
                                $pdoCfg['dsn'],
                                $pdoCfg['user'] ?? null,
                                $pdoCfg['password'] ?? null,
                                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
                            );
                            $realm = (string) (Config::load()[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');
                            $fromGate = SabreUiAuthGate::validatedUsername($realm);
                            if ($fromGate !== null) {
                                return new SabreAclLocalAdapter($filesRoot, $fromGate, $pdo);
                            }

                            $basic = new Basic($realm, Sapi::getRequest(), new Response());
                            $creds = $basic->getCredentials();
                            $username = strtolower(trim((string) ($creds[0] ?? '')));
                            if ($username === '') {
                                throw new \RuntimeException('Drive storage requires an authenticated user (HTTP Basic).');
                            }

                            // Match WebDAV {@see AppUserFilesHomeCollection}: administrators do not bypass per-user file dirs.
                            return new SabreAclLocalAdapter($filesRoot, $username, $pdo);
                        },
                    ],
                ],
                'Filegator\Services\Auth\AuthInterface' => [
                    'handler' => SabreDavBasicAuth::class,
                    'config' => [
                        'pdo' => static function (): \PDO {
                            $cfg = Config::load();
                            $c = Config::pdoCredentials($cfg);

                            return new \PDO($c['dsn'], $c['user'] ?? null, $c['password'] ?? null, [
                                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                            ]);
                        },
                        'realm' => static function (): string {
                            return (string) (Config::load()[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');
                        },
                    ],
                ],
                'Filegator\Services\Router\Router' => [
                    'handler' => \Filegator\Services\Router\Router::class,
                    'config' => [
                        'query_param' => 'r',
                        'routes_file' => Paths::resources().'/Filegator/drive-api-routes.php',
                    ],
                ],
            ],
        ];
    }

    private static function csrfSecret(string $csrfFile): string
    {
        if (is_readable($csrfFile)) {
            $s = trim((string) file_get_contents($csrfFile));
            if ($s !== '') {
                return $s;
            }
        }
        $dir = dirname($csrfFile);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $secret = bin2hex(random_bytes(24));
        file_put_contents($csrfFile, $secret, LOCK_EX);

        return $secret;
    }
}
