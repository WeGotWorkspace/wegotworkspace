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
        $hasRequiredMetadata = self::hasRequiredReleaseMetadata($latest);
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $checks = EnvChecker::checkAll($driver === 'mysql' ? 'mysql' : 'sqlite');
        $compatible = EnvChecker::allPassed($checks);
        $inProgress = is_file(UpdateStateStore::lockPath());
        $phase = $inProgress && is_string($state['phase'] ?? null) ? $state['phase'] : null;

        return [
            'installedVersion' => AppVersion::current(),
            'schemaVersion' => SchemaMigrationRunner::currentVersion($pdo),
            'latest' => $latest,
            'updateAvailable' => $hasRequiredMetadata && self::isUpdateAvailable(AppVersion::current(), $latest),
            'compatible' => $compatible,
            'checks' => $checks,
            'inProgress' => $inProgress,
            'phase' => $phase,
            'current' => $inProgress && is_array($state['current'] ?? null) ? $state['current'] : null,
            'download' => $inProgress && is_array($state['download'] ?? null) ? $state['download'] : null,
            'phaseProgress' => $inProgress && is_array($state['phase_progress'] ?? null) ? $state['phase_progress'] : null,
            'cancelRequested' => $inProgress && (bool) ($state['cancel_requested'] ?? false),
            'cancelAllowed' => $phase !== null && self::isCancellablePhase($phase),
            'lastCheckedAt' => is_string($state['last_checked_at'] ?? null) ? $state['last_checked_at'] : null,
            'lastCheckError' => is_string($state['last_check_error'] ?? null) ? $state['last_check_error'] : null,
            'lastResult' => is_array($state['last_result'] ?? null) ? $state['last_result'] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function check(\PDO $pdo, string $feedUrl): array
    {
        self::ensureRateLimit('check', 10);
        $state = UpdateStateStore::read();
        $state['last_checked_at'] = date('c');
        try {
            $feedUrl = trim($feedUrl);
            if ($feedUrl === '') {
                throw new \InvalidArgumentException('WGW_UPDATE_FEED_URL is not configured.');
            }
            self::assertHttpsUrl($feedUrl, 'Update feed URL');
            $latest = ReleaseFeedClient::fetchLatest($feedUrl);
            if (!is_array($latest)) {
                throw new \InvalidArgumentException('No valid release metadata found. Point WGW_UPDATE_FEED_URL to manifest.json or GitHub releases/latest API URL.');
            }
            $state['latest'] = self::normalizeRequiredReleaseMetadata($latest);
            $state['last_check_error'] = null;
        } catch (\Throwable $e) {
            $state['last_check_error'] = $e->getMessage();
            unset($state['latest']);
            UpdateStateStore::write($state);
            throw $e;
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
        $release = self::latestFromState();
        $requestedVersion = trim((string) ($input['version'] ?? ''));
        if ($requestedVersion !== '' && !hash_equals($release['version'], $requestedVersion)) {
            throw new \InvalidArgumentException('Checked release does not match the requested version. Check for updates again.');
        }
        $targetVersion = $release['version'];
        $packageUrl = $release['package_url'];
        $checksum = $release['checksum_sha256'];
        $checksumSignature = $release['checksum_signature'];

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
            UpdateStateStore::clearCancelRequest();
            self::writeStatus('downloading', $beforeVersion, $targetVersion);
            UpdateStateStore::cleanupTemporaryData();
            @mkdir(dirname(UpdateStateStore::packagePath()), 0775, true);
            self::downloadPackage($packageUrl, UpdateStateStore::packagePath(), $beforeVersion, $targetVersion);
            self::verifyChecksum(UpdateStateStore::packagePath(), $checksum);
            self::verifyChecksumSignature($checksum, $checksumSignature);

            self::writeStatus('extracting', $beforeVersion, $targetVersion);
            self::extractPackage(UpdateStateStore::packagePath(), UpdateStateStore::stagingDir(), $beforeVersion, $targetVersion);
            $releaseRoot = self::resolveReleaseRoot(UpdateStateStore::stagingDir());

            self::writeStatus('backing_up', $beforeVersion, $targetVersion);
            @mkdir($backupDir, 0775, true);
            self::backupPaths(Paths::appRoot(), $backupDir, $replacePaths, $beforeVersion, $targetVersion);
            self::throwIfCancelRequested();

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
            $didStartFileSwap = self::didStartApplyingFiles();
            if ($didStartFileSwap) {
                self::restorePaths($backupDir, Paths::appRoot(), $replacePaths);
                @file_put_contents(Paths::appRoot().'/VERSION', $beforeVersion."\n", LOCK_EX);
                SchemaMigrationRunner::migrate($pdo);
            }
            self::recordHistory(
                $pdo,
                $beforeVersion,
                $targetVersion,
                $e->getMessage() === 'Update cancelled by user.' ? 'cancelled' : 'failed',
                $e->getMessage()
            );
            $result['message'] = $e->getMessage();
            if ($e->getMessage() === 'Update cancelled by user.') {
                return $result;
            }
            throw $e;
        } finally {
            self::writeMaintenanceMode(false);
            $result['finishedAt'] = date('c');
            $state = UpdateStateStore::read();
            $state['last_result'] = $result;
            unset($state['phase'], $state['current'], $state['download'], $state['phase_progress'], $state['cancel_requested']);
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

    /**
     * @return array<string, mixed>
     */
    public static function cancel(\PDO $pdo): array
    {
        $state = UpdateStateStore::read();
        if (!is_file(UpdateStateStore::lockPath())) {
            throw new \InvalidArgumentException('No update is currently running.');
        }
        $phase = is_string($state['phase'] ?? null) ? $state['phase'] : '';
        if (!self::isCancellablePhase($phase)) {
            throw new \InvalidArgumentException('Cancellation is no longer available for this update stage.');
        }
        UpdateStateStore::requestCancel();
        $state['cancel_requested'] = true;
        UpdateStateStore::write($state);
        UpdateStateStore::appendLog('Cancellation requested by admin user.');

        return self::getState($pdo);
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

    private static function downloadPackage(string $url, string $target, string $fromVersion, string $toVersion): void
    {
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 60,
                'ignore_errors' => true,
                'header' => "User-Agent: WeGotWorkspace-Updater/1.0\r\n",
            ],
        ]);
        $input = @fopen($url, 'rb', false, $ctx);
        if (!is_resource($input)) {
            throw new \RuntimeException('Could not download release package.');
        }
        $tmpTarget = $target.'.part';
        $output = @fopen($tmpTarget, 'wb');
        if (!is_resource($output)) {
            fclose($input);
            throw new \RuntimeException('Could not write downloaded package.');
        }
        $meta = stream_get_meta_data($input);
        $totalBytes = self::parseContentLength($meta['wrapper_data'] ?? null);
        $downloadedBytes = 0;
        $lastProgressWriteAt = 0.0;
        self::writeDownloadProgress($fromVersion, $toVersion, $downloadedBytes, $totalBytes);

        try {
            while (!feof($input)) {
                self::throwIfCancelRequested();
                $chunk = fread($input, 1024 * 1024);
                if ($chunk === false) {
                    throw new \RuntimeException('Could not download release package.');
                }
                if ($chunk === '') {
                    continue;
                }
                $written = fwrite($output, $chunk);
                if ($written === false) {
                    throw new \RuntimeException('Could not write downloaded package.');
                }
                $downloadedBytes += $written;
                $now = microtime(true);
                if (($now - $lastProgressWriteAt) >= 0.2 || ($totalBytes !== null && $downloadedBytes >= $totalBytes)) {
                    self::writeDownloadProgress($fromVersion, $toVersion, $downloadedBytes, $totalBytes);
                    $lastProgressWriteAt = $now;
                }
            }
        } finally {
            fclose($input);
            fclose($output);
        }

        if ($downloadedBytes <= 0) {
            @unlink($tmpTarget);
            throw new \RuntimeException('Could not download release package.');
        }
        if ($totalBytes !== null && $downloadedBytes < $totalBytes) {
            @unlink($tmpTarget);
            throw new \RuntimeException('Downloaded package is incomplete.');
        }
        self::throwIfCancelRequested();
        if (!@rename($tmpTarget, $target)) {
            @unlink($tmpTarget);
            throw new \RuntimeException('Could not write downloaded package.');
        }
        self::writeDownloadProgress($fromVersion, $toVersion, $downloadedBytes, $downloadedBytes);
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

    /**
     * @return array{version: string, package_url: string, checksum_sha256: string, checksum_signature: string}
     */
    private static function latestFromState(): array
    {
        $state = UpdateStateStore::read();
        $latest = isset($state['latest']) && is_array($state['latest']) ? $state['latest'] : null;
        if ($latest === null) {
            throw new \RuntimeException('No checked update metadata found. Run Check now first.');
        }

        return self::normalizeRequiredReleaseMetadata($latest);
    }

    private static function extractPackage(string $zipPath, string $targetDir, string $fromVersion, string $toVersion): void
    {
        self::rmRecursive($targetDir);
        @mkdir($targetDir, 0775, true);
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \RuntimeException('Could not open release ZIP.');
        }
        $total = $zip->numFiles;
        if ($total <= 0) {
            $zip->close();
            throw new \RuntimeException('Release ZIP is empty.');
        }
        self::writePhaseProgress('extracting', $fromVersion, $toVersion, 0, $total);
        $done = 0;
        for ($i = 0; $i < $total; $i++) {
            self::throwIfCancelRequested();
            $name = $zip->getNameIndex($i);
            if (!is_string($name) || $name === '') {
                continue;
            }
            if (!$zip->extractTo($targetDir, [$name])) {
                $zip->close();
                throw new \RuntimeException('Could not extract release ZIP.');
            }
            $done++;
            self::writePhaseProgress('extracting', $fromVersion, $toVersion, $done, $total);
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
    private static function backupPaths(
        string $sourceRoot,
        string $backupRoot,
        array $paths,
        string $fromVersion,
        string $toVersion
    ): void {
        $total = count($paths);
        $done = 0;
        foreach ($paths as $relative) {
            self::throwIfCancelRequested();
            $src = $sourceRoot.'/'.$relative;
            if (file_exists($src)) {
                $dest = $backupRoot.'/'.$relative;
                self::copyRecursive($src, $dest, true);
            }
            $done++;
            self::writePhaseProgress('backing_up', $fromVersion, $toVersion, $done, $total);
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

    private static function copyRecursive(string $source, string $dest, bool $allowCancellation = false): void
    {
        if ($allowCancellation) {
            self::throwIfCancelRequested();
        }
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
                self::copyRecursive($source.'/'.$item, $dest.'/'.$item, $allowCancellation);
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

    /**
     * @param array<string, mixed>|null $latest
     */
    private static function hasRequiredReleaseMetadata(?array $latest): bool
    {
        if ($latest === null) {
            return false;
        }
        try {
            self::normalizeRequiredReleaseMetadata($latest);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param array<string, mixed> $latest
     *
     * @return array{version: string, package_url: string, checksum_sha256: string, checksum_signature: string}
     */
    private static function normalizeRequiredReleaseMetadata(array $latest): array
    {
        $version = self::requiredNonEmptyString($latest, 'version');
        $packageUrl = self::requiredNonEmptyString($latest, 'package_url');
        $checksum = self::requiredNonEmptyString($latest, 'checksum_sha256');
        $checksumSignature = self::requiredNonEmptyString($latest, 'checksum_signature');
        self::assertHttpsUrl($packageUrl, 'Release package URL');

        return [
            'version' => $version,
            'package_url' => $packageUrl,
            'checksum_sha256' => $checksum,
            'checksum_signature' => $checksumSignature,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function requiredNonEmptyString(array $data, string $field): string
    {
        $value = isset($data[$field]) && is_string($data[$field]) ? trim($data[$field]) : '';
        if ($value === '') {
            throw new \InvalidArgumentException('Release metadata is missing required field: '.$field.'.');
        }

        return $value;
    }

    private static function assertHttpsUrl(string $url, string $label): void
    {
        $parts = parse_url(trim($url));
        $scheme = is_array($parts) && isset($parts['scheme']) && is_string($parts['scheme'])
            ? strtolower($parts['scheme'])
            : '';
        if ($scheme !== 'https') {
            throw new \InvalidArgumentException($label.' must use HTTPS.');
        }
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
        if ($phase !== 'downloading') {
            unset($state['download']);
        }
        unset($state['phase_progress']);
        $state['cancel_requested'] = UpdateStateStore::isCancelRequested();
        UpdateStateStore::write($state);
    }

    private static function writeDownloadProgress(
        string $fromVersion,
        string $toVersion,
        int $downloadedBytes,
        ?int $totalBytes
    ): void {
        $state = UpdateStateStore::read();
        $state['phase'] = 'downloading';
        $state['current'] = [
            'from' => $fromVersion,
            'to' => $toVersion,
            'at' => date('c'),
        ];
        $state['download'] = [
            'downloadedBytes' => max(0, $downloadedBytes),
            'totalBytes' => $totalBytes,
            'percent' => $totalBytes !== null && $totalBytes > 0
                ? min(100, max(0, (int) floor(($downloadedBytes / $totalBytes) * 100)))
                : null,
            'updatedAt' => date('c'),
        ];
        $state['cancel_requested'] = UpdateStateStore::isCancelRequested();
        unset($state['phase_progress']);
        UpdateStateStore::write($state);
    }

    private static function writePhaseProgress(
        string $phase,
        string $fromVersion,
        string $toVersion,
        int $completed,
        int $total
    ): void {
        $safeTotal = max(1, $total);
        $safeCompleted = max(0, min($completed, $safeTotal));
        $state = UpdateStateStore::read();
        $state['phase'] = $phase;
        $state['current'] = [
            'from' => $fromVersion,
            'to' => $toVersion,
            'at' => date('c'),
        ];
        $state['phase_progress'] = [
            'completed' => $safeCompleted,
            'total' => $safeTotal,
            'percent' => min(100, max(0, (int) floor(($safeCompleted / $safeTotal) * 100))),
            'updatedAt' => date('c'),
        ];
        $state['cancel_requested'] = UpdateStateStore::isCancelRequested();
        unset($state['download']);
        UpdateStateStore::write($state);
    }

    private static function isCancellablePhase(string $phase): bool
    {
        return in_array($phase, ['downloading', 'extracting', 'backing_up'], true);
    }

    private static function throwIfCancelRequested(): void
    {
        if (!UpdateStateStore::isCancelRequested()) {
            return;
        }
        throw new \RuntimeException('Update cancelled by user.');
    }

    private static function didStartApplyingFiles(): bool
    {
        $state = UpdateStateStore::read();
        $phase = is_string($state['phase'] ?? null) ? $state['phase'] : '';

        return $phase === 'applying_files' || $phase === 'running_migrations';
    }

    /**
     * @param mixed $headers
     */
    private static function parseContentLength(mixed $headers): ?int
    {
        if (!is_array($headers)) {
            return null;
        }
        foreach ($headers as $header) {
            if (!is_string($header)) {
                continue;
            }
            if (preg_match('/^Content-Length:\s*(\d+)/i', $header, $m) !== 1) {
                continue;
            }
            $value = (int) $m[1];
            if ($value > 0) {
                return $value;
            }
        }

        return null;
    }

    private static function ensureRateLimit(string $action, int $seconds): void
    {
        $state = UpdateStateStore::read();
        $key = 'last_'.$action.'_at';
        $now = time();
        $last = isset($state[$key]) ? strtotime((string) $state[$key]) : false;
        if (is_int($last) && $last > 0 && ($now - $last) < $seconds) {
            throw new \InvalidArgumentException('Please wait before running another update '.$action.'.');
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
