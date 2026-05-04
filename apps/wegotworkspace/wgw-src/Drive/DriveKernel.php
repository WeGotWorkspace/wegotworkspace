<?php

declare(strict_types=1);

namespace App\Drive;

use App\Admin\AdminPolicy;
use App\Config;
use App\Installer\WebBase;
use App\Paths;
use App\Pwa\PwaSupport;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

final class DriveKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/drive');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        $cfg = Config::load();
        if (!($cfg[SettingsKeys::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

            return true;
        }

        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');
        $username = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);

        if (DriveStatic::tryServe($webBase, $path)) {
            return true;
        }

        if (!DriveStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';

        return true;
    }

    public static function respondApiFromToken(string $webBase, \PDO $pdo, string $username, string $route): void
    {
        self::respondApi($webBase, $pdo, $username, $route);
    }

    private static function respondApi(
        string $webBase,
        \PDO $pdo,
        string $username,
        string $route
    ): void
    {
        self::startSession($webBase);
        $route = trim($route);
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($route === '') {
            self::jsonError(404, 'Not found');

            return;
        }

        $groups = DriveAcl::allowedGroupSlugs($pdo, $username);
        $filesRoot = Paths::data().'/files';
        if (!is_dir($filesRoot)) {
            @mkdir($filesRoot, 0775, true);
        }

        try {
            if ($method === 'GET' && $route === '/getuser') {
                self::json(200, [
                    'data' => [
                        'username' => $username,
                        'name' => self::displayName($pdo, $username),
                        'role' => AdminPolicy::isAdmin($pdo, $username) ? 'admin' : 'user',
                    ],
                ]);

                return;
            }

            if ($method === 'GET' && $route === '/download') {
                self::handleDownload($filesRoot, $username, $groups);

                return;
            }

            if ($method === 'GET' && $route === '/upload') {
                self::plain(200, 'OK');

                return;
            }

            if ($method !== 'POST') {
                self::jsonError(405, 'Method not allowed');

                return;
            }

            if ($route === '/getdir') {
                $body = self::readJsonBody();
                $dir = DriveAcl::normalizeVirtualPath((string) ($body['dir'] ?? '/'));
                $_SESSION['drive_cwd'] = $dir;
                self::json(200, ['data' => self::directoryPayload($filesRoot, $dir, $username, $groups)]);

                return;
            }
            if ($route === '/searchfiles') {
                $body = self::readJsonBody();
                $q = trim((string) ($body['q'] ?? ''));
                $limit = max(1, min(100, (int) ($body['limit'] ?? 50)));
                self::json(200, ['data' => self::searchPayload($filesRoot, $q, $limit, $username, $groups)]);

                return;
            }
            if ($route === '/changedir') {
                $body = self::readJsonBody();
                $to = DriveAcl::normalizeVirtualPath((string) ($body['to'] ?? '/'));
                if (!DriveAcl::isPathAllowed($to, $username, $groups, false)) {
                    $to = '/';
                }
                $_SESSION['drive_cwd'] = $to;
                self::json(200, ['data' => ['cwd' => $to]]);

                return;
            }
            if ($route === '/createnew') {
                $body = self::readJsonBody();
                $name = self::validateItemName((string) ($body['name'] ?? ''));
                $type = (string) ($body['type'] ?? '');
                if ($type !== 'dir' && $type !== 'file') {
                    throw new \InvalidArgumentException('Invalid item type. Use "dir" or "file".');
                }
                $requestedCwd = isset($body['cwd']) && is_string($body['cwd']) ? $body['cwd'] : null;
                $cwd = self::resolveCwd($requestedCwd, $username, $groups);
                $newPath = DriveAcl::normalizeVirtualPath($cwd.'/'.$name);
                self::assertAllowed($newPath, $username, $groups, true);
                $abs = self::absolutePath($filesRoot, $newPath);
                if (file_exists($abs)) {
                    throw new \InvalidArgumentException('Item already exists.');
                }
                if ($type === 'dir') {
                    if (!@mkdir($abs, 0775, true)) {
                        throw new \RuntimeException('Could not create folder.');
                    }
                } else {
                    @mkdir(dirname($abs), 0775, true);
                    if (@file_put_contents($abs, '') === false) {
                        throw new \RuntimeException('Could not create file.');
                    }
                }
                self::json(200, ['data' => 'Created']);

                return;
            }
            if ($route === '/renameitem') {
                $body = self::readJsonBody();
                $destination = DriveAcl::normalizeVirtualPath((string) ($body['destination'] ?? '/'));
                $fromName = self::validateItemName((string) ($body['from'] ?? ''));
                $toName = self::validateItemName((string) ($body['to'] ?? ''));
                $fromPath = DriveAcl::normalizeVirtualPath($destination.'/'.$fromName);
                $toPath = DriveAcl::normalizeVirtualPath($destination.'/'.$toName);
                self::assertAllowed($fromPath, $username, $groups, true);
                self::assertAllowed($toPath, $username, $groups, true);
                $fromAbs = self::absolutePath($filesRoot, $fromPath);
                $toAbs = self::absolutePath($filesRoot, $toPath);
                if (!file_exists($fromAbs)) {
                    throw new \InvalidArgumentException('Source not found.');
                }
                if (file_exists($toAbs)) {
                    throw new \InvalidArgumentException('Destination already exists.');
                }
                @mkdir(dirname($toAbs), 0775, true);
                if (!@rename($fromAbs, $toAbs)) {
                    throw new \RuntimeException('Rename failed.');
                }
                self::json(200, ['data' => 'Renamed']);

                return;
            }
            if ($route === '/deleteitems') {
                $body = self::readJsonBody();
                $items = is_array($body['items'] ?? null) ? $body['items'] : [];
                foreach ($items as $item) {
                    if (!is_array($item)) {
                        continue;
                    }
                    $path = DriveAcl::normalizeVirtualPath((string) ($item['path'] ?? '/'));
                    self::assertAllowed($path, $username, $groups, true);
                    self::deleteRecursive(self::absolutePath($filesRoot, $path));
                }
                self::json(200, ['data' => 'Deleted']);

                return;
            }
            if ($route === '/upload') {
                self::handleUpload($filesRoot, $username, $groups);

                return;
            }

            self::jsonError(404, 'Not found');
        } catch (\InvalidArgumentException $e) {
            self::jsonError(400, $e->getMessage());
        } catch (\Throwable $e) {
            self::jsonError(500, 'Drive API error: '.$e->getMessage());
        }
    }

    /**
     * @return array{location:string,files:list<array{type:string,path:string,name:string,size:int,time:int,permissions:int}>}
     */
    private static function directoryPayload(string $filesRoot, string $dir, string $username, array $groups): array
    {
        self::assertAllowed($dir, $username, $groups, false);
        $entries = self::listEntries($filesRoot, $dir, $username, $groups, false, null);

        return [
            'location' => self::withTrailingSlash($dir),
            'files' => $entries,
        ];
    }

    /**
     * @return array{location:string,files:list<array{type:string,path:string,name:string,size:int,time:int,permissions:int}>}
     */
    private static function searchPayload(string $filesRoot, string $q, int $limit, string $username, array $groups): array
    {
        $q = trim($q);
        if ($q === '' || mb_strlen($q) < 2) {
            return ['location' => '/', 'files' => []];
        }
        $entries = self::listEntries($filesRoot, '/', $username, $groups, true, $q);

        return [
            'location' => '/',
            'files' => array_slice($entries, 0, $limit),
        ];
    }

    /**
     * @return list<array{type:string,path:string,name:string,size:int,time:int,permissions:int}>
     */
    private static function listEntries(
        string $filesRoot,
        string $virtualDir,
        string $username,
        array $groups,
        bool $recursive,
        ?string $nameQuery
    ): array {
        $out = [];
        $query = $nameQuery !== null ? mb_strtolower($nameQuery) : null;

        if ($virtualDir === '/' && !$recursive) {
            $roots = DriveAcl::listRootDirectories($username, $groups);
            foreach ($roots as $v) {
                if (!DriveAcl::isPathAllowed($v, $username, $groups, false)) {
                    continue;
                }
                $abs = self::absolutePath($filesRoot, $v);
                if (!is_dir($abs)) {
                    continue;
                }
                $name = basename($v);
                if ($query !== null && !str_contains(mb_strtolower($name), $query)) {
                    continue;
                }
                $out[] = self::serializeEntry($v, true, @filesize($abs) ?: 0, @filemtime($abs) ?: time());
            }
            return $out;
        }

        $startAbs = self::absolutePath($filesRoot, $virtualDir);
        if (!is_dir($startAbs)) {
            return $out;
        }

        if ($recursive) {
            $it = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($startAbs, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($it as $info) {
                /** @var \SplFileInfo $info */
                $abs = str_replace('\\', '/', (string) $info->getPathname());
                $rel = ltrim(substr($abs, strlen(rtrim($filesRoot, '/'))), '/');
                $virt = '/'.$rel;
                if (!DriveAcl::isPathAllowed($virt, $username, $groups, false)) {
                    continue;
                }
                if (self::isHiddenNotesPath($virt)) {
                    continue;
                }
                $name = $info->getFilename();
                if ($query !== null && !str_contains(mb_strtolower($name), $query)) {
                    continue;
                }
                $out[] = self::serializeEntry(
                    $virt,
                    $info->isDir(),
                    $info->isDir() ? 0 : (int) $info->getSize(),
                    (int) $info->getMTime()
                );
                if (count($out) >= 400) {
                    break;
                }
            }

            $q = $query ?? '';
            usort(
                $out,
                static function (array $a, array $b) use ($q): int {
                    $ap = str_starts_with(mb_strtolower($a['name']), $q) ? 0 : 1;
                    $bp = str_starts_with(mb_strtolower($b['name']), $q) ? 0 : 1;
                    if ($ap !== $bp) {
                        return $ap <=> $bp;
                    }
                    if ($a['type'] !== $b['type']) {
                        return $a['type'] === 'dir' ? -1 : 1;
                    }

                    return strnatcasecmp($a['name'], $b['name']);
                }
            );

            return $out;
        }

        $items = scandir($startAbs);
        if (!is_array($items)) {
            return $out;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $virt = DriveAcl::normalizeVirtualPath($virtualDir.'/'.$item);
            if (!DriveAcl::isPathAllowed($virt, $username, $groups, false)) {
                continue;
            }
            if (self::isHiddenNotesPath($virt)) {
                continue;
            }
            $abs = self::absolutePath($filesRoot, $virt);
            $isDir = is_dir($abs);
            $out[] = self::serializeEntry(
                $virt,
                $isDir,
                $isDir ? 0 : (is_file($abs) ? (int) filesize($abs) : 0),
                (int) (@filemtime($abs) ?: time())
            );
        }

        usort(
            $out,
            static function (array $a, array $b): int {
                if ($a['type'] !== $b['type']) {
                    return $a['type'] === 'dir' ? -1 : 1;
                }

                return strnatcasecmp($a['name'], $b['name']);
            }
        );

        return $out;
    }

    /**
     * @return array{type:string,path:string,name:string,size:int,time:int,permissions:int}
     */
    private static function serializeEntry(string $virtualPath, bool $isDir, int $size, int $time): array
    {
        return [
            'type' => $isDir ? 'dir' : 'file',
            'path' => DriveAcl::normalizeVirtualPath($virtualPath),
            'name' => basename(DriveAcl::normalizeVirtualPath($virtualPath)),
            'size' => max(0, $size),
            'time' => max(0, $time),
            'permissions' => 0,
        ];
    }

    private static function isHiddenNotesPath(string $virtualPath): bool
    {
        $normalized = DriveAcl::normalizeVirtualPath($virtualPath);

        return preg_match('#/(?:users|groups)/[^/]+/\.notes(?:/|$)#', $normalized) === 1;
    }

    private static function handleDownload(string $filesRoot, string $username, array $groups): void
    {
        $encoded = isset($_GET['path']) && is_string($_GET['path']) ? $_GET['path'] : '';
        $decoded = base64_decode($encoded, true);
        if (!is_string($decoded) || $decoded === '') {
            throw new \InvalidArgumentException('Invalid download path.');
        }
        $virtual = DriveAcl::normalizeVirtualPath($decoded);
        self::assertAllowed($virtual, $username, $groups, false);
        $abs = self::absolutePath($filesRoot, $virtual);
        if (!is_file($abs) || !is_readable($abs)) {
            throw new \InvalidArgumentException('File not found.');
        }
        $name = basename($virtual);
        $mime = (string) (mime_content_type($abs) ?: 'application/octet-stream');
        header('Content-Type: '.$mime);
        header('Content-Length: '.(string) filesize($abs));
        header('Content-Disposition: inline; filename="'.str_replace('"', '', $name).'"');
        readfile($abs);
    }

    private static function handleUpload(string $filesRoot, string $username, array $groups): void
    {
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            throw new \InvalidArgumentException('Missing upload file.');
        }
        $f = $_FILES['file'];
        $tmpName = isset($f['tmp_name']) && is_string($f['tmp_name']) ? $f['tmp_name'] : '';
        $error = isset($f['error']) ? (int) $f['error'] : \UPLOAD_ERR_NO_FILE;
        if ($error !== \UPLOAD_ERR_OK || $tmpName === '' || !is_uploaded_file($tmpName)) {
            throw new \InvalidArgumentException('Invalid upload payload.');
        }

        $filename = self::validateItemName((string) ($_POST['resumableFilename'] ?? ''));
        $identifier = preg_replace('/[^0-9A-Za-z_]/', '_', (string) ($_POST['resumableIdentifier'] ?? ''));
        $chunkNumber = max(1, (int) ($_POST['resumableChunkNumber'] ?? 1));
        $totalChunks = max(1, (int) ($_POST['resumableTotalChunks'] ?? 1));
        $requestedCwd = isset($_POST['cwd']) && is_string($_POST['cwd']) ? $_POST['cwd'] : null;
        $cwd = self::resolveCwd($requestedCwd, $username, $groups);
        $targetVirtual = DriveAcl::normalizeVirtualPath($cwd.'/'.$filename);
        self::assertAllowed($targetVirtual, $username, $groups, true);
        $targetAbs = self::absolutePath($filesRoot, $targetVirtual);
        @mkdir(dirname($targetAbs), 0775, true);

        if ($totalChunks <= 1) {
            if (!move_uploaded_file($tmpName, $targetAbs)) {
                throw new \RuntimeException('Could not store file.');
            }
            self::plain(200, 'Stored');

            return;
        }

        $tmpDir = Paths::data().'/drive-upload-temp';
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0775, true);
        }
        $tmpFile = $tmpDir.'/'.hash('sha256', $identifier.'|'.$filename.'|'.$targetVirtual).'.part';
        $mode = $chunkNumber === 1 ? 'wb' : 'ab';
        $out = @fopen($tmpFile, $mode);
        $in = @fopen($tmpName, 'rb');
        if (!is_resource($out) || !is_resource($in)) {
            throw new \RuntimeException('Could not process upload chunk.');
        }
        stream_copy_to_stream($in, $out);
        fclose($in);
        fclose($out);

        if ($chunkNumber < $totalChunks) {
            self::plain(200, 'Uploaded');

            return;
        }

        if (!@rename($tmpFile, $targetAbs)) {
            @unlink($tmpFile);
            throw new \RuntimeException('Could not finalize upload.');
        }
        self::plain(200, 'Stored');
    }

    private static function readJsonBody(): array
    {
        $raw = '';
        if (isset($GLOBALS['__WGW_TEST_JSON_BODY']) && is_string($GLOBALS['__WGW_TEST_JSON_BODY'])) {
            $raw = $GLOBALS['__WGW_TEST_JSON_BODY'];
        } else {
            $raw = (string) file_get_contents('php://input');
        }
        if ($raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \InvalidArgumentException('Invalid JSON body.');
        }

        return $decoded;
    }

    private static function startSession(string $webBase): void
    {
        if (session_status() === \PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('FGSSID');
        session_set_cookie_params([
            'path' => WebBase::url($webBase, '/drive/'),
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        ]);
        session_start();
    }

    private static function json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo (string) json_encode($payload, JSON_UNESCAPED_SLASHES);
    }

    private static function jsonError(int $status, string $message): void
    {
        self::json($status, ['data' => $message]);
    }

    private static function plain(int $status, string $text): void
    {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        echo $text;
    }

    private static function assertAllowed(string $virtualPath, string $username, array $groups, bool $forWrite): void
    {
        if (!DriveAcl::isPathAllowed($virtualPath, $username, $groups, $forWrite)) {
            throw new \InvalidArgumentException('Access denied for this path.');
        }
    }

    private static function absolutePath(string $filesRoot, string $virtualPath): string
    {
        $rel = ltrim(DriveAcl::normalizeVirtualPath($virtualPath), '/');
        $base = rtrim(str_replace('\\', '/', $filesRoot), '/');
        if ($rel === '') {
            return $base;
        }

        return $base.'/'.$rel;
    }

    private static function withTrailingSlash(string $virtualPath): string
    {
        $path = DriveAcl::normalizeVirtualPath($virtualPath);

        return $path === '/' ? '/' : $path.'/';
    }

    private static function validateItemName(string $name): string
    {
        $name = trim($name);
        if ($name === '' || $name === '.' || $name === '..' || str_contains($name, '/') || str_contains($name, '\\') || str_contains($name, "\0")) {
            throw new \InvalidArgumentException('Invalid item name.');
        }

        return $name;
    }

    private static function deleteRecursive(string $path): void
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
            self::deleteRecursive($path.'/'.$item);
        }
        @rmdir($path);
    }

    private static function currentCwd(string $username, array $groups): string
    {
        $cwd = isset($_SESSION['drive_cwd']) && is_string($_SESSION['drive_cwd']) ? $_SESSION['drive_cwd'] : '/';
        $cwd = DriveAcl::normalizeVirtualPath($cwd);
        if (!DriveAcl::isPathAllowed($cwd, $username, $groups, false)) {
            return '/';
        }

        return $cwd;
    }

    private static function resolveCwd(?string $requested, string $username, array $groups): string
    {
        if ($requested !== null && trim($requested) !== '') {
            $requestedPath = DriveAcl::normalizeVirtualPath($requested);
            if (!DriveAcl::isPathAllowed($requestedPath, $username, $groups, false)) {
                throw new \InvalidArgumentException('Access denied for this path.');
            }

            return $requestedPath;
        }

        return self::currentCwd($username, $groups);
    }

    private static function displayName(\PDO $pdo, string $username): string
    {
        $stmt = $pdo->prepare('SELECT displayname FROM principals WHERE uri = ? LIMIT 1');
        $stmt->execute(['principals/'.$username]);
        $value = $stmt->fetchColumn();

        return is_string($value) && trim($value) !== '' ? trim($value) : $username;
    }

    private static function respondDistMissing(string $webBase): void
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Drive</title>';
        echo PwaSupport::headMetaTags($webBase, 'drive');
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Drive</h1>';
        echo '<p>The Drive UI build is missing. From the project root, run <code>pnpm --filter @wgw/drive-ui build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/drive-ui/</code>; the Vite build writes to <code>wgw-modules/drive/dist/</code>.</p>';
        echo '<p class="hint">Open <code>'.htmlspecialchars(WebBase::url($webBase, '/drive/'), ENT_QUOTES, 'UTF-8').'</code> after signing in at <code>'.htmlspecialchars(WebBase::url($webBase, '/login/'), ENT_QUOTES, 'UTF-8').'</code>.</p>';
        echo '</body></html>';
    }
}
