<?php

declare(strict_types=1);

namespace App\Api;

use App\Admin\AdminConstants;
use App\Admin\AdminPolicy;
use App\Admin\GroupManager;
use App\Admin\UserProvisioner;
use App\Drive\DriveAcl;
use App\Installer\WebBase;
use App\Mail\MailApi;
use App\Mail\MailCredentialStore;
use App\Paths;
use App\Settings\SettingsDefaults;
use App\Settings\SettingsKeys;
use App\Settings\SettingsRepository;
use App\Update\UpdateManager;
use App\Voice\VoiceSignaling;

final class ApiDomainHandlers
{
    /**
     * @param array{username: string, role: 'guest'|'user'|'admin'}|null $principal
     */
    public static function dispatch(string $webBase, string $method, string $rel, ?array $principal, \PDO $pdo, string $realm): bool
    {
        if ($method === 'GET' && $rel === 'installer/state') {
            ApiResponse::json(200, [
                'installed' => is_file(Paths::lockFile()),
                'maintenance' => UpdateManager::inMaintenanceMode(),
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'admin/state') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
            ApiResponse::json(200, [
                'me' => $admin,
                'users' => UserProvisioner::listUsers($pdo),
                'groups' => GroupManager::listCollections($pdo, AdminConstants::GROUP_PREFIX),
                'settings' => $cfg,
                'updates' => UpdateManager::getState($pdo),
            ]);

            return true;
        }

        if ($method === 'POST' && $rel === 'admin/users') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            UserProvisioner::create(
                $pdo,
                strtolower(trim((string) ($body['username'] ?? ''))),
                (string) ($body['password'] ?? ''),
                trim((string) ($body['displayName'] ?? '')),
                isset($body['email']) && is_string($body['email']) && trim($body['email']) !== '' ? trim((string) $body['email']) : null
            );
            ApiResponse::json(201, ['ok' => true]);

            return true;
        }

        if (preg_match('#^admin/users/([a-z0-9_-]{2,63})$#', $rel, $m)) {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $username = (string) ($m[1] ?? '');
            if ($method === 'PATCH') {
                $body = ApiRequest::jsonBody();
                if (array_key_exists('displayName', $body) || array_key_exists('email', $body)) {
                    UserProvisioner::updateProfile(
                        $pdo,
                        $username,
                        trim((string) ($body['displayName'] ?? '')),
                        isset($body['email']) && is_string($body['email']) && trim($body['email']) !== '' ? trim((string) $body['email']) : null
                    );
                }
                if (isset($body['password']) && is_string($body['password']) && $body['password'] !== '') {
                    UserProvisioner::updatePassword($pdo, $username, $body['password']);
                }
                ApiResponse::json(200, ['ok' => true]);

                return true;
            }
            if ($method === 'DELETE') {
                UserProvisioner::delete($pdo, $username);
                ApiResponse::json(200, ['ok' => true]);

                return true;
            }
        }

        if ($method === 'POST' && $rel === 'admin/groups') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            $slug = self::slug((string) ($body['slug'] ?? ''));
            GroupManager::createPrincipal($pdo, AdminConstants::GROUP_PREFIX.$slug, trim((string) ($body['displayName'] ?? '')));
            ApiResponse::json(201, ['ok' => true]);

            return true;
        }

        if (preg_match('#^admin/groups/([a-z0-9_-]{2,63})$#', $rel, $m)) {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $slug = (string) ($m[1] ?? '');
            $uri = AdminConstants::GROUP_PREFIX.$slug;
            if ($method === 'DELETE') {
                GroupManager::deleteCollection($pdo, $uri);
                ApiResponse::json(200, ['ok' => true]);

                return true;
            }
            if ($method === 'PATCH') {
                $body = ApiRequest::jsonBody();
                $members = [];
                if (is_array($body['members'] ?? null)) {
                    foreach ($body['members'] as $u) {
                        if (!is_string($u) || !preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $u)) {
                            continue;
                        }
                        $members[] = 'principals/'.$u;
                    }
                }
                GroupManager::setMembers($pdo, $uri, $members);
                ApiResponse::json(200, ['ok' => true]);

                return true;
            }
        }

        if ($method === 'PUT' && $rel === 'admin/settings') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            $allowed = array_flip(SettingsKeys::all());
            $values = [];
            if (is_array($body['values'] ?? null)) {
                foreach ($body['values'] as $key => $value) {
                    if (is_string($key) && isset($allowed[$key])) {
                        $values[$key] = $value;
                    }
                }
            }
            SettingsRepository::replaceManyDriver($pdo, $values);
            ApiResponse::json(200, ['ok' => true, 'saved' => array_keys($values)]);

            return true;
        }

        if ($method === 'GET' && $rel === 'admin/updates/state') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            ApiResponse::json(200, UpdateManager::getState($pdo));

            return true;
        }

        if ($method === 'POST' && $rel === 'admin/updates/check') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $feedUrl = trim((string) (getenv('WGW_UPDATE_FEED_URL') ?: ''));
            if ($feedUrl === '') {
                $feedUrl = 'https://github.com/woutervroege/wegotworkspace/releases/latest/download/manifest.json';
            }
            ApiResponse::json(200, UpdateManager::check($pdo, $feedUrl));

            return true;
        }

        if ($method === 'POST' && $rel === 'admin/updates/apply') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            ApiResponse::json(200, UpdateManager::apply($pdo, ApiRequest::jsonBody()));

            return true;
        }

        if ($method === 'POST' && $rel === 'admin/updates/cancel') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            ApiResponse::json(200, UpdateManager::cancel($pdo));

            return true;
        }

        if ($method === 'GET' && $rel === 'settings/state') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            ApiResponse::json(200, self::settingsState($webBase, $pdo, $user['username']));

            return true;
        }

        if ($method === 'PUT' && $rel === 'settings/profile') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            UserProvisioner::updateProfile(
                $pdo,
                $user['username'],
                trim((string) ($body['displayName'] ?? '')),
                isset($body['email']) && is_string($body['email']) && trim($body['email']) !== '' ? trim((string) $body['email']) : null
            );
            if (isset($body['password']) && is_string($body['password']) && $body['password'] !== '') {
                UserProvisioner::updatePassword($pdo, $user['username'], $body['password']);
            }
            ApiResponse::json(200, self::settingsState($webBase, $pdo, $user['username']));

            return true;
        }

        if ($method === 'PUT' && $rel === 'settings/mail') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            MailCredentialStore::save($pdo, $user['username'], [
                'imap' => [
                    'username' => trim((string) ($body['imapUsername'] ?? '')),
                    'password' => (string) ($body['imapPassword'] ?? ''),
                ],
            ]);
            ApiResponse::json(200, self::settingsState($webBase, $pdo, $user['username']));

            return true;
        }

        if ($method === 'GET' && $rel === 'mail/status') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            self::delegateMail($webBase, $pdo, $user['username'], 'status');

            return true;
        }

        if ($method === 'GET' && $rel === 'mail/config') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            self::delegateMail($webBase, $pdo, $user['username'], 'config');

            return true;
        }

        if ($method === 'PUT' && $rel === 'mail/config') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            self::delegateMail($webBase, $pdo, $user['username'], 'config');

            return true;
        }

        if ($method === 'GET' && $rel === 'drive/user') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $stmt = $pdo->prepare('SELECT displayname FROM principals WHERE uri = ? LIMIT 1');
            $stmt->execute(['principals/'.$user['username']]);
            $display = (string) ($stmt->fetchColumn() ?: $user['username']);
            ApiResponse::json(200, [
                'data' => [
                    'username' => $user['username'],
                    'name' => $display,
                    'role' => $user['role'],
                    'roots' => DriveAcl::listRootDirectories($user['username'], DriveAcl::allowedGroupSlugs($pdo, $user['username'])),
                ],
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'notes/capabilities') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
            ApiResponse::json(200, [
                'enabled' => (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true),
                'distReady' => is_file(Paths::notesDist().'/index.html'),
                'baseUri' => (string) ($cfg[SettingsKeys::BASE_URI] ?? '/'),
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'office/capabilities') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
            $officeRoot = Paths::officeUiBuild();
            ApiResponse::json(200, [
                'enabled' => (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true),
                'indexReady' => is_readable($officeRoot.'/index.html'),
                'editorReady' => is_readable($officeRoot.'/editor.html') || is_readable($officeRoot.'/editor/index.html'),
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'home/state') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
            ApiResponse::json(200, [
                'username' => $user['username'],
                'isAdmin' => $user['role'] === 'admin',
                'availability' => [
                    'filesEnabled' => (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true),
                    'drive' => is_file(Paths::driveDist().'/index.html'),
                    'mail' => is_file(Paths::mailDist().'/index.html'),
                    'voice' => is_file(Paths::voiceDist().'/index.html'),
                    'notes' => is_file(Paths::notesDist().'/index.html'),
                    'office' => is_readable(Paths::officeUiBuild().'/index.html'),
                ],
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'dav/capabilities') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
            ApiResponse::json(200, [
                'baseUri' => (string) ($cfg[SettingsKeys::BASE_URI] ?? '/'),
                'filesEnabled' => (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true),
                'calendarEnabled' => (bool) ($cfg[SettingsKeys::CALENDAR_ENABLED] ?? true),
                'contactsEnabled' => (bool) ($cfg[SettingsKeys::CONTACTS_ENABLED] ?? true),
            ]);

            return true;
        }

        if (
            $method === 'POST'
            && in_array($rel, ['voice/join', 'voice/poll', 'voice/send', 'voice/leave', 'voice/chat'], true)
        ) {
            $_GET['action'] = explode('/', $rel)[1] ?? '';
            VoiceSignaling::respond($pdo, $realm);

            return true;
        }

        return false;
    }

    /**
     * @param array{username: string, role: 'guest'|'user'|'admin'}|null $principal
     *
     * @return array{username: string, role: 'guest'|'user'|'admin'}|null
     */
    private static function requireRole(?array $principal, string $required): ?array
    {
        $actual = $principal['role'] ?? 'guest';
        if (!ApiKernel::roleAllows($actual, $required)) {
            if ($required !== 'guest' && $principal === null) {
                ApiResponse::error(401, 'Missing or invalid bearer token.', 'unauthorized');
            } else {
                ApiResponse::error(403, 'Insufficient role.', 'forbidden');
            }

            return null;
        }

        return $principal;
    }

    private static function slug(string $value): string
    {
        $slug = strtolower(trim($value));
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $slug)) {
            throw new \InvalidArgumentException('Invalid slug.');
        }

        return $slug;
    }

    /**
     * @return array<string, mixed>
     */
    private static function settingsState(string $webBase, \PDO $pdo, string $username): array
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

    private static function delegateMail(string $webBase, \PDO $pdo, string $username, string $tail): void
    {
        $path = rtrim(WebBase::url($webBase, '/mail/api'), '/').'/'.$tail;
        MailApi::respond($webBase, $path, $username, $pdo);
    }
}
