<?php

declare(strict_types=1);

namespace App\UserSettings;

use App\Admin\AdminConstants;
use App\Admin\GroupManager;
use App\Admin\UserProvisioner;
use App\Config;
use App\Installer\WebBase;
use App\Mail\MailCredentialStore;
use App\Pwa\PwaSupport;
use App\SabreUiAuthGate;
use App\Settings\SettingsDefaults;
use App\Settings\SettingsKeys;
use App\Settings\SettingsRepository;

final class UserSettingsUiKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/settings');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        $settingsNoSlash = WebBase::url($webBase, '/settings');
        if ($path === $settingsNoSlash) {
            self::redirectTo($webBase, '/settings/');

            return true;
        }

        try {
            $cfg = Config::load();
            $pdoCfg = Config::pdoCredentials($cfg);
            $pdo = new \PDO(
                $pdoCfg['dsn'],
                $pdoCfg['user'] ?? null,
                $pdoCfg['password'] ?? null,
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
            $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');
            $username = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);
        } catch (\Throwable) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Could not load configuration or database.';

            return true;
        }

        if (self::tryRespondApi($webBase, $path, $pdo, $username)) {
            return true;
        }

        if (!UserSettingsUiStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        if (UserSettingsUiStatic::tryServe($webBase, $path)) {
            return true;
        }

        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';

        return true;
    }

    private static function tryRespondApi(string $webBase, string $path, \PDO $pdo, string $username): bool
    {
        $apiPrefix = WebBase::url($webBase, '/settings/api');
        if ($path !== $apiPrefix && !str_starts_with($path, $apiPrefix.'/')) {
            return false;
        }
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $rel = $path === $apiPrefix ? '' : substr($path, strlen($apiPrefix) + 1);
        $rel = trim((string) $rel, '/');

        try {
            if ($method === 'GET' && $rel === 'state') {
                self::json(200, self::buildState($webBase, $pdo, $username));

                return true;
            }
            $body = self::readJsonBody();
            if ($method === 'POST' && $rel === 'profile/save') {
                self::handleSaveProfile($pdo, $username, $body);
                self::json(200, self::buildState($webBase, $pdo, $username));

                return true;
            }
            if ($method === 'POST' && $rel === 'mail/save') {
                self::handleSaveMailCredentials($pdo, $username, $body);
                self::json(200, self::buildState($webBase, $pdo, $username));

                return true;
            }
        } catch (\InvalidArgumentException $e) {
            self::json(400, ['error' => $e->getMessage()]);

            return true;
        } catch (\Throwable $e) {
            self::json(500, ['error' => 'User settings API error: '.$e->getMessage()]);

            return true;
        }

        self::json(404, ['error' => 'Not found']);

        return true;
    }

    private static function redirectTo(string $webBase, string $path): void
    {
        $qs = isset($_SERVER['QUERY_STRING']) && is_string($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
            ? '?'.$_SERVER['QUERY_STRING']
            : '';
        header('Location: '.WebBase::url($webBase, $path).$qs, true, 302);
    }

    private static function respondDistMissing(string $webBase): void
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>User Settings</title>';
        echo PwaSupport::headMetaTags($webBase, 'settings');
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>User Settings</h1>';
        echo '<p>The User Settings UI build is missing. From the project root, run <code>pnpm --filter @wgw/user-settings build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/user-settings/</code>; the Vite build writes to <code>wgw-modules/settings/dist/</code>.</p>';
        echo '<p class="hint">Open <code>'.htmlspecialchars(WebBase::url($webBase, '/settings/'), ENT_QUOTES, 'UTF-8').'</code> after signing in.</p>';
        echo '</body></html>';
    }

    /**
     * @return array{
     *   user: array{username: string, displayName: string, email: string},
     *   groups: list<array{id: string, displayName: string}>,
     *   mail: array{imapUsername: string, imapHasPassword: bool},
     *   mailServer: array{
     *     imapHost: string,
     *     imapPort: int,
     *     imapSecurity: string,
     *     smtpHost: string,
     *     smtpPort: int,
     *     smtpSecurity: string
     *   },
     *   logoutUrl: string
     * }
     */
    private static function buildState(string $webBase, \PDO $pdo, string $username): array
    {
        $principalUri = 'principals/'.$username;
        $stmt = $pdo->prepare('SELECT displayname, email FROM principals WHERE uri = ?');
        $stmt->execute([$principalUri]);
        $principal = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
        $displayName = trim((string) ($principal['displayname'] ?? ''));
        $email = trim((string) ($principal['email'] ?? ''));

        $groups = [];
        foreach (GroupManager::listCollections($pdo, AdminConstants::GROUP_PREFIX) as $group) {
            $members = GroupManager::getMembers($pdo, (string) $group['uri']);
            if (!in_array($principalUri, $members, true)) {
                continue;
            }
            $groups[] = [
                'id' => (string) $group['uri'],
                'displayName' => (string) $group['title'],
            ];
        }

        $mail = MailCredentialStore::loadAccount($pdo, $username) ?? ['imapUsername' => '', 'imapPassword' => ''];
        $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));

        return [
            'user' => [
                'username' => $username,
                'displayName' => $displayName !== '' ? $displayName : $username,
                'email' => $email,
            ],
            'groups' => $groups,
            'mail' => [
                'imapUsername' => (string) ($mail['imapUsername'] ?? ''),
                'imapHasPassword' => ((string) ($mail['imapPassword'] ?? '')) !== '',
            ],
            'mailServer' => [
                'imapHost' => (string) ($cfg[SettingsKeys::MAIL_IMAP_HOST] ?? ''),
                'imapPort' => (int) ($cfg[SettingsKeys::MAIL_IMAP_PORT] ?? 993),
                'imapSecurity' => (string) ($cfg[SettingsKeys::MAIL_IMAP_SECURITY] ?? 'ssl'),
                'smtpHost' => (string) ($cfg[SettingsKeys::MAIL_SMTP_HOST] ?? ''),
                'smtpPort' => (int) ($cfg[SettingsKeys::MAIL_SMTP_PORT] ?? 465),
                'smtpSecurity' => (string) ($cfg[SettingsKeys::MAIL_SMTP_SECURITY] ?? 'ssl'),
            ],
            'logoutUrl' => WebBase::url($webBase, '/logout/'),
        ];
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleSaveProfile(\PDO $pdo, string $username, array $body): void
    {
        $displayName = trim((string) ($body['displayName'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        $principalUri = 'principals/'.$username;
        $stmt = $pdo->prepare('UPDATE principals SET displayname = ?, email = ? WHERE uri = ?');
        $stmt->execute([
            $displayName !== '' ? $displayName : null,
            $email !== '' ? $email : null,
            $principalUri,
        ]);

        $exists = $pdo->prepare('SELECT 1 FROM principals WHERE uri = ?');
        $exists->execute([$principalUri]);
        if ($exists->fetchColumn() === false) {
            throw new \InvalidArgumentException('Your account principal does not exist.');
        }

        if ($password !== '') {
            UserProvisioner::updatePassword($pdo, $username, $password);
        }
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleSaveMailCredentials(\PDO $pdo, string $username, array $body): void
    {
        $imapUsername = trim((string) ($body['imapUsername'] ?? ''));
        $imapPassword = (string) ($body['imapPassword'] ?? '');
        MailCredentialStore::save($pdo, $username, [
            'imap' => [
                'username' => $imapUsername,
                'password' => $imapPassword,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function readJsonBody(): array
    {
        $raw = (string) file_get_contents('php://input');
        if ($raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body.');
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo (string) json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
