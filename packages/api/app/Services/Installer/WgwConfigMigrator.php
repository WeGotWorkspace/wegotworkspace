<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Support\AppPaths;
use App\Support\UpdateFeedDefaults;
use App\Support\WgwDatabaseProbe;
use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\Artisan;

final class WgwConfigMigrator
{
    public function __construct(
        private WgwInstallConfig $install,
        private InstallerEnvWriter $envWriter,
        private ApiRuntimeEnvService $apiEnv,
    ) {}

    public static function migrateAtPaths(string $installRoot, string $apiPackageRoot, bool $clearConfig = true): bool
    {
        $legacyPath = rtrim($installRoot, '/').'/wgw-config.php';
        if (! is_readable($legacyPath)) {
            return false;
        }

        $apiEnv = new ApiRuntimeEnvService;
        $apiEnv->seedEnvFromExampleIfMissing($apiPackageRoot);
        $envPath = $apiPackageRoot.'/.env';

        $legacy = WgwLegacyConfigParser::read($legacyPath);
        $pairs = self::legacyToEnvPairs($legacy);

        $timestamp = date('Ymd-His');
        @copy($legacyPath, $legacyPath.'.bak.'.$timestamp);
        if (is_file($envPath)) {
            @copy($envPath, $envPath.'.bak.'.$timestamp);
        }

        $writer = new InstallerEnvWriter(
            new AppPaths(new WgwInstallConfig, new WgwDatabaseProbe(new WgwInstallConfig)),
            $apiEnv,
        );
        $writer->patchEnvFile($envPath, $pairs);
        self::applyPairsToRuntime($pairs);

        if (! @unlink($legacyPath)) {
            throw new \RuntimeException('Could not remove legacy wgw-config.php after migration.');
        }

        if ($clearConfig && class_exists(Artisan::class)) {
            try {
                Artisan::call('config:clear');
            } catch (\Throwable) {
            }
        }

        return true;
    }

    public function migrateIfNeeded(bool $clearConfig = true): bool
    {
        $installRoot = $this->install->installRoot();
        $apiRoot = $this->apiEnv->apiPackageRoot($installRoot);
        if ($apiRoot === null) {
            return false;
        }

        $legacyPath = $installRoot.'/wgw-config.php';
        if (! is_readable($legacyPath)) {
            return false;
        }

        $this->apiEnv->seedEnvFromExampleIfMissing($apiRoot);
        $envPath = $apiRoot.'/.env';

        $legacy = WgwLegacyConfigParser::read($legacyPath);
        $pairs = self::legacyToEnvPairs($legacy);

        $timestamp = date('Ymd-His');
        @copy($legacyPath, $legacyPath.'.bak.'.$timestamp);
        if (is_file($envPath)) {
            @copy($envPath, $envPath.'.bak.'.$timestamp);
        }

        $this->envWriter->patchEnvFile($envPath, $pairs);
        self::applyPairsToRuntime($pairs);

        if (! @unlink($legacyPath)) {
            throw new \RuntimeException('Could not remove legacy wgw-config.php after migration.');
        }

        if ($clearConfig && class_exists(Artisan::class)) {
            try {
                Artisan::call('config:clear');
            } catch (\Throwable) {
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $legacy
     * @return array<string, string>
     */
    private static function legacyToEnvPairs(array $legacy): array
    {
        $dataDir = './wgw-content';
        $sabre = getenv('SABRE_DATA_DIR');
        if (is_string($sabre) && trim($sabre) !== '') {
            $dataDir = trim($sabre);
        } elseif (isset($legacy['data_dir']) && is_string($legacy['data_dir']) && trim($legacy['data_dir']) !== '') {
            $dataDir = trim($legacy['data_dir']);
        }

        $feed = isset($legacy['update_feed_url']) && is_string($legacy['update_feed_url'])
            ? trim($legacy['update_feed_url'])
            : '';
        $pairs = [
            'WGW_DATA_DIR' => $dataDir,
            'WGW_UPDATE_FEED_URL' => $feed !== '' ? $feed : UpdateFeedDefaults::MANIFEST_URL,
        ];

        if (isset($legacy['install_channel']) && is_string($legacy['install_channel']) && trim($legacy['install_channel']) !== '') {
            $pairs['WGW_INSTALL_CHANNEL'] = trim($legacy['install_channel']);
        }

        $pdo = $legacy['pdo'] ?? null;
        if (! is_array($pdo)) {
            return $pairs;
        }

        $installRoot = getenv('WGW_APP_ROOT');
        $apiRoot = is_string($installRoot) && $installRoot !== ''
            ? rtrim($installRoot, '/').'/packages/api'
            : null;
        $writer = new InstallerEnvWriter(
            new AppPaths(new WgwInstallConfig, new WgwDatabaseProbe(new WgwInstallConfig)),
            new ApiRuntimeEnvService,
        );
        $dbPairs = $writer->envPairsFromBootstrap([
            'data_dir' => $dataDir,
            'pdo' => $pdo,
        ]);

        return array_merge($pairs, array_diff_key($dbPairs, array_flip(['WGW_DATA_DIR', 'WGW_UPDATE_FEED_URL'])));
    }

    /**
     * @param  array<string, string>  $pairs
     */
    private static function applyPairsToRuntime(array $pairs): void
    {
        foreach ($pairs as $key => $value) {
            putenv($key.'='.$value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}
