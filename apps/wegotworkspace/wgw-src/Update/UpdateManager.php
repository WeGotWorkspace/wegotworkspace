<?php

declare(strict_types=1);

namespace App\Update;

use App\Installer\EnvChecker;
use App\Paths;

final class UpdateManager
{
    /**
     * @return array<string, mixed>
     */
    public static function getState(\PDO $pdo): array
    {
        $state = UpdateStateStore::read();
        $latest = isset($state['latest']) && is_array($state['latest']) ? $state['latest'] : null;
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $checks = EnvChecker::checkAll($driver === 'mysql' ? 'mysql' : 'sqlite');
        $compatible = EnvChecker::allPassed($checks);

        return [
            'installedVersion' => AppVersion::current(),
            'schemaVersion' => SchemaMigrationRunner::currentVersion($pdo),
            'latest' => $latest,
            'updateAvailable' => self::isUpdateAvailable(AppVersion::current(), $latest),
            'compatible' => $compatible,
            'checks' => $checks,
            'inProgress' => is_file(UpdateStateStore::lockPath()),
            'lastCheckedAt' => is_string($state['last_checked_at'] ?? null) ? $state['last_checked_at'] : null,
            'lastResult' => is_array($state['last_result'] ?? null) ? $state['last_result'] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function check(\PDO $pdo, string $feedUrl): array
    {
        self::ensureRateLimit('check', 10);
        $latest = ReleaseFeedClient::fetchLatest($feedUrl);
        $state = UpdateStateStore::read();
        $state['last_checked_at'] = date('c');
        if ($latest !== null) {
            $state['latest'] = $latest;
        }
        UpdateStateStore::write($state);

        return self::getState($pdo);
    }

    /**
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function apply(\PDO $pdo, array $input): array
    {
        self::ensureRateLimit('apply', 30);
        $lock = @fopen(UpdateStateStore::lockPath(), 'c+');
        if (!is_resource($lock)) {
            throw new \RuntimeException('Could not create update lock file.');
        }
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            throw new \RuntimeException('Another update process is already running.');
        }

        $beforeVersion = AppVersion::current();
        $targetVersion = trim((string) ($input['version'] ?? ''));
        $packageUrl = trim((string) ($input['package_url'] ?? ''));
        $checksum = trim((string) ($input['checksum_sha256'] ?? ''));
        $checksumSignature = trim((string) ($input['checksum_signature'] ?? ''));
        if ($targetVersion === '' || $packageUrl === '') {
            throw new \InvalidArgumentException('Missing target version/package URL.');
        }

        $backupDir = UpdateStateStore::backupDir().'/backup-'.date('YmdHis');
        $replacePaths = [
            'index.php',
            'composer.json',
            'composer.lock',
            'VERSION',
            'wgw-config.sample.php',
            'vendor',
            'wgw-src',
            'wgw-modules',
        ];

        $result = [
            'ok' => false,
            'version' => $targetVersion,
            'message' => '',
            'finishedAt' => null,
        ];

        try {
            UpdateStateStore::appendLog('Update started: '.$beforeVersion.' -> '.$targetVersion);
            self::writeStatus('downloading', $beforeVersion, $targetVersion);
            UpdateStateStore::cleanupTemporaryData();
            @mkdir(dirname(UpdateStateStore::packagePath()), 0775, true);
            self::downloadPackage($packageUrl, UpdateStateStore::packagePath());
            if ($checksum !== '') {
                self::verifyChecksum(UpdateStateStore::packagePath(), $checksum);
                if ($checksumSignature !== '') {
                    self::verifyChecksumSignature($checksum, $checksumSignature);
                }
            }

            self::writeStatus('extracting', $beforeVersion, $targetVersion);
            self::extractPackage(UpdateStateStore::packagePath(), UpdateStateStore::stagingDir());
            $releaseRoot = self::resolveReleaseRoot(UpdateStateStore::stagingDir());

            self::writeStatus('backing_up', $beforeVersion, $targetVersion);
            @mkdir($backupDir, 0775, true);
            self::backupPaths(Paths::appRoot(), $backupDir, $replacePaths);

            self::writeMaintenanceMode(true);
            self::writeStatus('applying_files', $beforeVersion, $targetVersion);
            self::applyPaths($releaseRoot, Paths::appRoot(), $replacePaths);
            file_put_contents(Paths::appRoot().'/VERSION', $targetVersion."\n", LOCK_EX);

            self::writeStatus('running_migrations', $beforeVersion, $targetVersion);
            SchemaMigrationRunner::migrate($pdo);
            self::recordHistory($pdo, $beforeVersion, $targetVersion, 'success', 'Update applied successfully.');
            $result['ok'] = true;
            $result['message'] = 'Update applied successfully.';
            UpdateStateStore::appendLog('Update finished successfully.');
        } catch (\Throwable $e) {
            UpdateStateStore::appendLog('Update failed: '.$e->getMessage());
            self::restorePaths($backupDir, Paths::appRoot(), $replacePaths);
            @file_put_contents(Paths::appRoot().'/VERSION', $beforeVersion."\n", LOCK_EX);
            SchemaMigrationRunner::migrate($pdo);
            self::recordHistory($pdo, $beforeVersion, $targetVersion, 'failed', $e->getMessage());
            $result['message'] = $e->getMessage();
            throw $e;
        } finally {
            self::writeMaintenanceMode(false);
            $result['finishedAt'] = date('c');
            $state = UpdateStateStore::read();
            $state['last_result'] = $result;
            UpdateStateStore::write($state);
            @unlink(UpdateStateStore::lockPath());
            flock($lock, LOCK_UN);
            fclose($lock);
            UpdateStateStore::cleanupTemporaryData();
        }

        return $result;
    }

    public static function inMaintenanceMode(): bool
    {
        return is_file(UpdateStateStore::maintenancePath());
    }

    private static function writeMaintenanceMode(bool $enabled): void
    {
        if ($enabled) {
            @mkdir(UpdateStateStore::baseDir(), 0775, true);
            file_put_contents(UpdateStateStore::maintenancePath(), date('c')."\n", LOCK_EX);

            return;
        }
        @unlink(UpdateStateStore::maintenancePath());
    }

    private static function downloadPackage(string $url, string $target): void
    {
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 60,
                'ignore_errors' => true,
                'header' => "User-Agent: WeGotWorkspace-Updater/1.0\r\n",
            ],
        ]);
        $data = @file_get_contents($url, false, $ctx);
        if (!is_string($data) || $data === '') {
            throw new \RuntimeException('Could not download release package.');
        }
        if (file_put_contents($target, $data, LOCK_EX) === false) {
            throw new \RuntimeException('Could not write downloaded package.');
        }
    }

    private static function verifyChecksum(string $path, string $expected): void
    {
        $actual = hash_file('sha256', $path);
        if (!is_string($actual) || !hash_equals(strtolower($expected), strtolower($actual))) {
            throw new \RuntimeException('Release checksum verification failed.');
        }
    }

    private static function verifyChecksumSignature(string $checksum, string $signature): void
    {
        if (!function_exists('openssl_verify')) {
            throw new \RuntimeException('OpenSSL extension is required for signature verification.');
        }
        $publicKeyPath = Paths::resources().'/Update/update-public-key.pem';
        if (!is_readable($publicKeyPath)) {
            throw new \RuntimeException('Missing update public key for signature verification.');
        }
        $publicKey = trim((string) file_get_contents($publicKeyPath));
        if ($publicKey === '' || str_contains($publicKey, 'REPLACE_WITH_RELEASE_SIGNING_PUBLIC_KEY')) {
            throw new \RuntimeException('Update public key is not configured.');
        }
        $decodedSig = base64_decode($signature, true);
        if ($decodedSig === false) {
            throw new \RuntimeException('Invalid update signature format.');
        }
        $ok = openssl_verify($checksum, $decodedSig, $publicKey, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) {
            throw new \RuntimeException('Release signature verification failed.');
        }
    }

    private static function extractPackage(string $zipPath, string $targetDir): void
    {
        self::rmRecursive($targetDir);
        @mkdir($targetDir, 0775, true);
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \RuntimeException('Could not open release ZIP.');
        }
        if (!$zip->extractTo($targetDir)) {
            $zip->close();
            throw new \RuntimeException('Could not extract release ZIP.');
        }
        $zip->close();
    }

    private static function resolveReleaseRoot(string $stagingDir): string
    {
        $items = scandir($stagingDir);
        if (!is_array($items)) {
            return $stagingDir;
        }
        $entries = array_values(array_filter($items, static fn (string $v): bool => $v !== '.' && $v !== '..'));
        if (count($entries) === 1) {
            $only = $stagingDir.'/'.$entries[0];
            if (is_dir($only)) {
                return $only;
            }
        }

        return $stagingDir;
    }

    /**
     * @param list<string> $paths
     */
    private static function backupPaths(string $sourceRoot, string $backupRoot, array $paths): void
    {
        foreach ($paths as $relative) {
            $src = $sourceRoot.'/'.$relative;
            if (!file_exists($src)) {
                continue;
            }
            $dest = $backupRoot.'/'.$relative;
            self::copyRecursive($src, $dest);
        }
    }

    /**
     * @param list<string> $paths
     */
    private static function applyPaths(string $sourceRoot, string $targetRoot, array $paths): void
    {
        foreach ($paths as $relative) {
            $src = $sourceRoot.'/'.$relative;
            if (!file_exists($src)) {
                continue;
            }
            $dest = $targetRoot.'/'.$relative;
            self::rmRecursive($dest);
            self::copyRecursive($src, $dest);
        }
    }

    /**
     * @param list<string> $paths
     */
    private static function restorePaths(string $backupRoot, string $targetRoot, array $paths): void
    {
        if (!is_dir($backupRoot)) {
            return;
        }
        foreach ($paths as $relative) {
            $src = $backupRoot.'/'.$relative;
            if (!file_exists($src)) {
                continue;
            }
            $dest = $targetRoot.'/'.$relative;
            self::rmRecursive($dest);
            self::copyRecursive($src, $dest);
        }
    }

    private static function copyRecursive(string $source, string $dest): void
    {
        if (is_dir($source)) {
            @mkdir($dest, 0775, true);
            $items = scandir($source);
            if (!is_array($items)) {
                throw new \RuntimeException('Could not read directory: '.$source);
            }
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                self::copyRecursive($source.'/'.$item, $dest.'/'.$item);
            }

            return;
        }
        @mkdir(dirname($dest), 0775, true);
        if (!copy($source, $dest)) {
            throw new \RuntimeException('Could not copy file: '.$source);
        }
    }

    private static function rmRecursive(string $path): void
    {
        if (is_file($path) || is_link($path)) {
            @unlink($path);

            return;
        }
        if (!is_dir($path)) {
            return;
        }
        $items = scandir($path);
        if (!is_array($items)) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            self::rmRecursive($path.'/'.$item);
        }
        @rmdir($path);
    }

    /**
     * @param array<string, mixed>|null $latest
     */
    private static function isUpdateAvailable(string $installed, ?array $latest): bool
    {
        if ($latest === null) {
            return false;
        }
        $candidate = trim((string) ($latest['version'] ?? ''));
        if ($candidate === '') {
            return false;
        }

        return version_compare(self::normalizeVersion($candidate), self::normalizeVersion($installed), '>');
    }

    private static function normalizeVersion(string $version): string
    {
        $trimmed = trim($version);
        if (str_starts_with($trimmed, 'v')) {
            return substr($trimmed, 1);
        }

        return $trimmed;
    }

    private static function writeStatus(string $phase, string $fromVersion, string $toVersion): void
    {
        $state = UpdateStateStore::read();
        $state['phase'] = $phase;
        $state['current'] = [
            'from' => $fromVersion,
            'to' => $toVersion,
            'at' => date('c'),
        ];
        UpdateStateStore::write($state);
    }

    private static function ensureRateLimit(string $action, int $seconds): void
    {
        $state = UpdateStateStore::read();
        $key = 'last_'.$action.'_at';
        $now = time();
        $last = isset($state[$key]) ? strtotime((string) $state[$key]) : false;
        if (is_int($last) && $last > 0 && ($now - $last) < $seconds) {
            throw new \RuntimeException('Please wait before running another update '.$action.'.');
        }
        $state[$key] = date('c');
        UpdateStateStore::write($state);
    }

    private static function recordHistory(
        \PDO $pdo,
        string $fromVersion,
        string $toVersion,
        string $status,
        string $message
    ): void {
        $stmt = $pdo->prepare(
            'INSERT INTO app_update_history (from_version, to_version, status, message, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$fromVersion, $toVersion, $status, $message, date('c')]);
    }
}
