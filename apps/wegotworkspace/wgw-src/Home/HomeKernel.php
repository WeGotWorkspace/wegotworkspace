<?php

declare(strict_types=1);

namespace App\Home;

use App\Config;
use App\Installer\WebBase;
use App\Paths;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

final class HomeKernel
{
    public static function tryRespond(string $webBase, string $path): bool
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'GET' && $method !== 'HEAD') {
            return false;
        }

        if (!HomeStatic::isHomePath($webBase, $path)) {
            return false;
        }

        if (
            self::isInstallRoot($webBase, $path)
            && isset($_GET['sabreAction'])
            && is_string($_GET['sabreAction'])
            && $_GET['sabreAction'] !== ''
        ) {
            return false;
        }

        try {
            $cfg = Config::load();
        } catch (\Throwable) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo "Could not load configuration.\n";

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
        $signedInUser = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);

        $filesOn = (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true);
        $driveOk = $filesOn && is_file(Paths::driveDist().'/index.html');
        $mailOk = $filesOn && is_file(Paths::mailDist().'/index.html');
        $voiceOk = $filesOn && is_file(Paths::voiceDist().'/index.html');
        $notesOk = $filesOn && is_file(Paths::notesDist().'/index.html');
        $officeRoot = Paths::officeUiBuild();
        $officeOk = $filesOn && is_readable($officeRoot.'/index.html') && is_readable($officeRoot.'/editor.html');

        if ($method === 'HEAD') {
            return true;
        }

        $admin = WebBase::url($webBase, '/admin/');
        $settings = WebBase::url($webBase, '/settings/');
        $drive = WebBase::url($webBase, '/drive/');
        $mail = WebBase::url($webBase, '/mail/');
        $voice = WebBase::url($webBase, '/voice/');
        $notes = WebBase::url($webBase, '/notes/');
        $office = WebBase::url($webBase, '/office/');
        $officeDoc = WebBase::url($webBase, '/office/editor?new=docx');
        $officeSheet = WebBase::url($webBase, '/office/editor?new=xlsx');
        $officeSlides = WebBase::url($webBase, '/office/editor?new=pptx');
        $logout = WebBase::url($webBase, '/logout/');

        if (!HomeStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        return HomeStatic::tryServe(
            $webBase,
            $path,
            [
                'title' => 'WeGotWorkspace',
                'realm' => $realm,
                'username' => $signedInUser,
                'apps' => [
                    'admin' => $admin,
                    'settings' => $settings,
                    'drive' => $drive,
                    'mail' => $mail,
                    'voice' => $voice,
                    'notes' => $notes,
                    'office' => $office,
                    'officeDoc' => $officeDoc,
                    'officeSheet' => $officeSheet,
                    'officeSlides' => $officeSlides,
                ],
                'logoutUrl' => $logout,
                'availability' => [
                    'filesEnabled' => $filesOn,
                    'drive' => $driveOk,
                    'mail' => $mailOk,
                    'voice' => $voiceOk,
                    'notes' => $notesOk,
                    'office' => $officeOk,
                ],
            ]
        );
    }

    private static function isInstallRoot(string $webBase, string $path): bool
    {
        $withSlash = WebBase::url($webBase, '/');
        if ($path === $withSlash) {
            return true;
        }
        if ($webBase !== '') {
            return $path === $webBase || $path === $webBase.'/';
        }

        return false;
    }

    private static function respondDistMissing(string $webBase): void
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Home</title>';
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Home</h1>';
        echo '<p>The Home UI build is missing. From the project root, run <code>pnpm --filter @wgw/home-ui build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/home-ui/</code>; the Vite build writes to <code>wgw-modules/home/dist/</code>.</p>';
        echo '<p class="hint">Open <code>'.htmlspecialchars(WebBase::url($webBase, '/'), ENT_QUOTES, 'UTF-8').'</code> after signing in at <code>'.htmlspecialchars(WebBase::url($webBase, '/login/'), ENT_QUOTES, 'UTF-8').'</code>.</p>';
        echo '</body></html>';
    }
}
