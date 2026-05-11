<?php

declare(strict_types=1);

namespace App\Api;

use App\Admin\AdminConstants;
use App\Admin\AdminPolicy;
use App\Admin\GroupManager;
use App\Admin\UserProvisioner;
use App\Drive\DriveAcl;
use App\Drive\DriveKernel;
use App\Installer\InstallerKernel;
use App\Installer\WebBase;
use App\Mail\MailApi;
use App\Mail\MailCredentialStore;
use App\Paths;
use App\Settings\SettingsDefaults;
use App\Settings\SettingsKeys;
use App\Settings\SettingsRepository;
use App\Update\UpdateManager;
use App\Update\UpdateStateStore;
use App\Voice\VoiceSignaling;

final class ApiDomainHandlers
{
    /**
     * @param array{username: string, role: 'guest'|'user'|'admin'}|null $principal
     */
    public static function dispatch(string $webBase, string $method, string $rel, ?array $principal, \PDO $pdo, string $realm): bool
    {
        if ($method === 'GET' && $rel === 'installer/state') {
            $bootstrap = InstallerKernel::bootstrapPayloadFromApi($webBase);
            ApiResponse::json(200, [
                'installed' => is_file(Paths::lockFile()),
                'maintenance' => UpdateManager::inMaintenanceMode(),
                'state' => $bootstrap['state'],
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'installer/bootstrap') {
            ApiResponse::json(200, InstallerKernel::bootstrapPayloadFromApi($webBase));

            return true;
        }

        if ($method === 'POST' && $rel === 'installer/action') {
            $body = ApiRequest::jsonBody();
            $action = isset($body['action']) && is_string($body['action']) ? $body['action'] : '';
            $payload = is_array($body['payload'] ?? null) ? $body['payload'] : [];
            ApiResponse::json(200, InstallerKernel::applyApiActionFromApi($webBase, $action, $payload));

            return true;
        }

        if ($method === 'GET' && $rel === 'admin/state') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            ApiResponse::json(200, self::adminState($webBase, $pdo, $admin['username']));

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
            self::setUserGroups(
                $pdo,
                strtolower(trim((string) ($body['username'] ?? ''))),
                self::toStringList($body['groups'] ?? []),
                $admin['username']
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
                if (array_key_exists('groups', $body)) {
                    self::setUserGroups($pdo, $username, self::toStringList($body['groups'] ?? []), $admin['username']);
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
            $slugInput = (string) ($body['slug'] ?? '');
            if ($slugInput === '' && isset($body['name']) && is_string($body['name'])) {
                $slugInput = (string) $body['name'];
            }
            $slug = self::slug($slugInput);
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
                if (array_key_exists('displayName', $body)) {
                    $displayName = trim((string) ($body['displayName'] ?? ''));
                    $stmt = $pdo->prepare('UPDATE principals SET displayname = ? WHERE uri = ?');
                    $stmt->execute([$displayName !== '' ? $displayName : null, $uri]);
                }
                if (array_key_exists('members', $body)) {
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
                }
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

        if ($method === 'GET' && $rel === 'admin/updates/log') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            ApiResponse::json(200, ['lines' => UpdateStateStore::readLog()]);

            return true;
        }

        if ($method === 'DELETE' && $rel === 'admin/updates/log') {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            UpdateStateStore::clearLog();
            ApiResponse::json(200, ['ok' => true, 'lines' => []]);

            return true;
        }

        if (preg_match('#^admin/updates/backups/([A-Za-z0-9._-]+)$#', $rel, $m)) {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $backupName = self::ensureBackupName((string) ($m[1] ?? ''));
            if ($method === 'GET') {
                self::downloadBackup($backupName);

                return true;
            }
            if ($method === 'DELETE') {
                ApiResponse::json(200, UpdateManager::deleteBackup($pdo, ['name' => $backupName]));

                return true;
            }
        }

        if (preg_match('#^admin/groups/([a-z0-9_-]{2,63})/members/([a-z0-9_-]{2,63})$#', $rel, $m)) {
            $admin = self::requireRole($principal, 'admin');
            if ($admin === null) {
                return true;
            }
            $groupUri = AdminConstants::GROUP_PREFIX.(string) ($m[1] ?? '');
            $username = (string) ($m[2] ?? '');
            if ($method === 'PUT') {
                self::setMembership($pdo, $groupUri, $username, true, $admin['username']);
                ApiResponse::json(200, ['ok' => true]);

                return true;
            }
            if ($method === 'DELETE') {
                self::setMembership($pdo, $groupUri, $username, false, $admin['username']);
                ApiResponse::json(200, ['ok' => true]);

                return true;
            }
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
            self::delegateMail($pdo, $user['username'], 'status');

            return true;
        }

        if ($method === 'GET' && $rel === 'mail/config') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            self::delegateMail($pdo, $user['username'], 'config');

            return true;
        }

        if ($method === 'PUT' && $rel === 'mail/config') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            self::delegateMail($pdo, $user['username'], 'config');

            return true;
        }

        if (
            str_starts_with($rel, 'mail/')
            && preg_match('#^(status|config|folders|messages|messages/attachments|message|message/attachment|move|send|draft)$#', substr($rel, 5)) === 1
        ) {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            self::delegateMail($pdo, $user['username'], substr($rel, 5));

            return true;
        }

        if ($method === 'GET' && $rel === 'drive/user') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $display = self::principalDisplayName($pdo, $user['username']);
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

        if (
            str_starts_with($rel, 'drive/')
            && preg_match('#^(getdir|searchfiles|changedir|createnew|renameitem|deleteitems|download|upload|stars)$#', substr($rel, 6)) === 1
        ) {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            DriveKernel::respondApiFromToken($webBase, $pdo, $user['username'], '/'.substr($rel, 6));

            return true;
        }

        if ($method === 'GET' && $rel === 'notes/state') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
            ApiResponse::json(200, [
                'baseUri' => (string) ($cfg[SettingsKeys::BASE_URI] ?? '/'),
                'username' => $user['username'],
                'displayName' => self::principalDisplayName($pdo, $user['username']),
                'logoutUrl' => WebBase::url($webBase, '/logout/'),
                'notesPath' => WebBase::url($webBase, '/notes/'),
                'filesEnabled' => (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true),
                'distReady' => is_file(Paths::notesDist().'/index.html'),
            ]);

            return true;
        }

        if ($method === 'GET' && $rel === 'notes/items') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $params = [];
            if (isset($_GET['archived'])) {
                $params['archived'] = $_GET['archived'];
            }
            if (isset($_GET['notebook'])) {
                $params['notebook'] = $_GET['notebook'];
            }
            if (isset($_GET['q'])) {
                $params['q'] = $_GET['q'];
            }
            ApiResponse::json(200, self::notesList($user['username'], $params));

            return true;
        }

        if ($method === 'GET' && $rel === 'notes/notebooks') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            ApiResponse::json(200, self::notesNotebooks($user['username']));

            return true;
        }

        if ($method === 'POST' && $rel === 'notes/notebooks') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            ApiResponse::json(201, self::notesNotebookCreate($user['username'], ApiRequest::jsonBody()));

            return true;
        }

        if ($method === 'POST' && $rel === 'notes/items') {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            ApiResponse::json(201, self::notesUpsert($user['username'], null, $body));

            return true;
        }

        if (preg_match('#^notes/items/([A-Za-z0-9._-]{1,120})$#', $rel, $m)) {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $noteId = (string) ($m[1] ?? '');
            if ($method === 'PUT') {
                ApiResponse::json(200, self::notesUpsert($user['username'], $noteId, ApiRequest::jsonBody()));

                return true;
            }
            if ($method === 'DELETE') {
                ApiResponse::json(200, self::notesDelete($user['username'], $noteId, ApiRequest::jsonBody()));

                return true;
            }
        }

        if (preg_match('#^notes/notebooks/([^/]+)$#', $rel, $m)) {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $name = rawurldecode((string) ($m[1] ?? ''));
            if ($method === 'PATCH') {
                ApiResponse::json(200, self::notesNotebookRename($user['username'], $name, ApiRequest::jsonBody()));

                return true;
            }
            if ($method === 'DELETE') {
                ApiResponse::json(200, self::notesNotebookDelete($user['username'], $name, ApiRequest::jsonBody()));

                return true;
            }
        }

        if (preg_match('#^notes/items/([A-Za-z0-9._-]{1,120})/(archive|restore)$#', $rel, $m)) {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            if ($method !== 'POST') {
                ApiResponse::error(405, 'Method not allowed.', 'method_not_allowed');

                return true;
            }
            $noteId = (string) ($m[1] ?? '');
            $action = (string) ($m[2] ?? '');
            ApiResponse::json(200, self::notesMoveArchiveState($user['username'], $noteId, $action === 'archive'));

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

        if ($rel === 'office/documents' && in_array($method, ['POST', 'PUT'], true)) {
            $user = self::requireRole($principal, 'user');
            if ($user === null) {
                return true;
            }
            $body = ApiRequest::jsonBody();
            ApiResponse::json(200, self::officeUpsertDocument($pdo, $user['username'], $body, $method === 'POST'));

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

    private static function delegateMail(\PDO $pdo, string $username, string $tail): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        MailApi::respondOperation($method, trim($tail, '/'), $username, $pdo);
    }

    private static function ensureBackupName(string $name): string
    {
        $trimmed = trim($name);
        if ($trimmed === '' || preg_match('/^[A-Za-z0-9._-]+$/', $trimmed) !== 1) {
            throw new \InvalidArgumentException('Invalid backup file name.');
        }

        return $trimmed;
    }

    private static function downloadBackup(string $name): void
    {
        $base = realpath(UpdateStateStore::backupDir());
        $path = UpdateStateStore::backupDir().'/'.$name;
        $real = (is_file($path) || is_dir($path)) ? realpath($path) : false;
        if ($base === false || $real === false || !str_starts_with($real, $base)) {
            throw new \InvalidArgumentException('Backup not found.');
        }
        if (is_dir($real)) {
            throw new \InvalidArgumentException('Legacy backup folders are not directly downloadable. Use ZIP backups.');
        }
        if (!is_readable($real)) {
            throw new \RuntimeException('Backup file is not readable.');
        }
        header('Content-Type: application/zip');
        header('Content-Length: '.(string) filesize($real));
        header('Content-Disposition: attachment; filename="'.basename($real).'"');
        readfile($real);
    }

    private static function setMembership(\PDO $pdo, string $groupUri, string $username, bool $enabled, string $actingAdmin): void
    {
        if ($groupUri === AdminConstants::ADMIN_GROUP_URI && $username === $actingAdmin && !$enabled) {
            throw new \InvalidArgumentException('You cannot remove your own administrator access.');
        }
        $principal = 'principals/'.$username;
        $members = GroupManager::getMembers($pdo, $groupUri);
        $isMember = in_array($principal, $members, true);
        if ($enabled && !$isMember) {
            $members[] = $principal;
            GroupManager::setMembers($pdo, $groupUri, $members);

            return;
        }
        if (!$enabled && $isMember) {
            $members = array_values(array_filter($members, static fn (string $m): bool => $m !== $principal));
            GroupManager::setMembers($pdo, $groupUri, $members);
        }
    }

    private static function principalDisplayName(\PDO $pdo, string $username): string
    {
        $stmt = $pdo->prepare('SELECT displayname FROM principals WHERE uri = ? LIMIT 1');
        $stmt->execute(['principals/'.$username]);
        $display = trim((string) ($stmt->fetchColumn() ?: ''));

        return $display !== '' ? $display : $username;
    }

    /**
     * @return array<string, mixed>
     */
    private static function adminState(string $webBase, \PDO $pdo, string $adminUser): array
    {
        $usersRaw = UserProvisioner::listUsers($pdo);
        $groupsRaw = GroupManager::listCollections($pdo, AdminConstants::GROUP_PREFIX);
        $groupMembers = [];
        foreach ($groupsRaw as $g) {
            $groupMembers[(string) $g['uri']] = GroupManager::getMembers($pdo, (string) $g['uri']);
        }

        $users = [];
        foreach ($usersRaw as $u) {
            $principal = 'principals/'.(string) $u['username'];
            $memberOf = [];
            foreach ($groupMembers as $groupUri => $members) {
                if (in_array($principal, $members, true)) {
                    $memberOf[] = $groupUri;
                }
            }
            $users[] = [
                'id' => (string) $u['username'],
                'username' => (string) $u['username'],
                'email' => (string) ($u['email'] ?? ''),
                'displayName' => (string) ($u['displayname'] ?? $u['username']),
                'groups' => $memberOf,
                'createdAt' => '',
            ];
        }

        $groups = [];
        foreach ($groupsRaw as $g) {
            $uri = (string) $g['uri'];
            $groups[] = [
                'id' => $uri,
                'name' => basename($uri),
                'displayName' => (string) $g['title'],
            ];
        }

        $cfg = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
        $voiceUrls = (string) ($cfg[SettingsKeys::VOICE_TURN_URL] ?? '');
        $stun = [];
        $turn = [];
        foreach (preg_split('/[\r\n,]+/', $voiceUrls) ?: [] as $piece) {
            $u = trim((string) $piece);
            if ($u === '') {
                continue;
            }
            if (preg_match('#^stuns?:#i', $u) === 1) {
                $stun[] = $u;
                continue;
            }
            $turn[] = $u;
        }

        return [
            'users' => $users,
            'groups' => $groups,
            'mail' => [
                'imapHost' => (string) ($cfg[SettingsKeys::MAIL_IMAP_HOST] ?? ''),
                'imapPort' => (int) ($cfg[SettingsKeys::MAIL_IMAP_PORT] ?? 993),
                'imapSecurity' => (string) ($cfg[SettingsKeys::MAIL_IMAP_SECURITY] ?? 'ssl'),
                'smtpHost' => (string) ($cfg[SettingsKeys::MAIL_SMTP_HOST] ?? ''),
                'smtpPort' => (int) ($cfg[SettingsKeys::MAIL_SMTP_PORT] ?? 465),
                'smtpSecurity' => (string) ($cfg[SettingsKeys::MAIL_SMTP_SECURITY] ?? 'ssl'),
            ],
            'voice' => [
                'signalingUrl' => (string) ($cfg[SettingsKeys::VOICE_SIGNALING_URL] ?? ''),
                'stunUrls' => implode("\n", $stun),
                'turnUrls' => implode("\n", $turn),
                'turnUsername' => (string) ($cfg[SettingsKeys::VOICE_TURN_USERNAME] ?? ''),
                'turnPassword' => (string) ($cfg[SettingsKeys::VOICE_TURN_CREDENTIAL] ?? ''),
                'forceRelay' => (bool) ($cfg[SettingsKeys::VOICE_FORCE_RELAY] ?? false),
            ],
            'apps' => [
                'calendars' => (bool) ($cfg[SettingsKeys::CALENDAR_ENABLED] ?? true),
                'contacts' => (bool) ($cfg[SettingsKeys::CONTACTS_ENABLED] ?? true),
            ],
            'webdav' => [
                'sabreUi' => (bool) ($cfg[SettingsKeys::BROWSER_PLUGIN] ?? true),
                'timezone' => (string) ($cfg[SettingsKeys::TIMEZONE] ?? 'UTC'),
                'baseUri' => (string) ($cfg[SettingsKeys::BASE_URI] ?? '/'),
                'authRealm' => (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV'),
            ],
            'updates' => UpdateManager::getState($pdo),
            'currentUser' => $adminUser,
            'logoutUrl' => WebBase::url($webBase, '/logout/'),
        ];
    }

    /**
     * @param mixed $value
     *
     * @return list<string>
     */
    private static function toStringList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $v) {
            if (!is_string($v)) {
                continue;
            }
            $trim = trim($v);
            if ($trim !== '') {
                $out[] = $trim;
            }
        }

        return $out;
    }

    /**
     * @param list<string> $groupUris
     */
    private static function setUserGroups(\PDO $pdo, string $username, array $groupUris, ?string $adminUser = null): void
    {
        $wanted = array_values(array_filter($groupUris, static fn (string $g): bool => str_starts_with($g, AdminConstants::GROUP_PREFIX)));
        $principal = 'principals/'.$username;
        $groups = GroupManager::listCollections($pdo, AdminConstants::GROUP_PREFIX);
        foreach ($groups as $group) {
            $groupUri = (string) $group['uri'];
            $members = GroupManager::getMembers($pdo, $groupUri);
            $isWanted = in_array($groupUri, $wanted, true);
            $isMember = in_array($principal, $members, true);
            if (
                $groupUri === AdminConstants::ADMIN_GROUP_URI
                && $adminUser !== null
                && $username === $adminUser
                && !$isWanted
                && $isMember
            ) {
                throw new \InvalidArgumentException('You cannot remove your own administrator access.');
            }
            if ($isWanted && !$isMember) {
                $members[] = $principal;
                GroupManager::setMembers($pdo, $groupUri, $members);
                continue;
            }
            if (!$isWanted && $isMember) {
                $members = array_values(array_filter($members, static fn (string $m): bool => $m !== $principal));
                GroupManager::setMembers($pdo, $groupUri, $members);
            }
        }
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{ok: bool, path: string, bytes: int}
     */
    private static function officeUpsertDocument(\PDO $pdo, string $username, array $body, bool $create): array
    {
        $pathRaw = isset($body['path']) && is_string($body['path']) ? trim($body['path']) : '';
        if ($pathRaw === '') {
            throw new \InvalidArgumentException('path is required.');
        }
        $path = DriveAcl::normalizeVirtualPath($pathRaw);
        if (!preg_match('#^/(?:users|groups)/[^/]+/.+#', $path)) {
            throw new \InvalidArgumentException('path must target users/* or groups/* storage.');
        }
        $ext = strtolower((string) pathinfo($path, \PATHINFO_EXTENSION));
        if (!in_array($ext, ['docx', 'xlsx', 'pptx'], true)) {
            throw new \InvalidArgumentException('Only .docx, .xlsx, and .pptx are supported.');
        }

        $groups = DriveAcl::allowedGroupSlugs($pdo, $username);
        if (!DriveAcl::isPathAllowed($path, $username, $groups, true)) {
            throw new \InvalidArgumentException('Access denied for this path.');
        }

        $filesRoot = rtrim(Paths::data(), '/').'/files';
        $abs = rtrim($filesRoot, '/').'/'.ltrim($path, '/');
        @mkdir(dirname($abs), 0775, true);

        $contentBase64 = isset($body['content_base64']) && is_string($body['content_base64']) ? trim($body['content_base64']) : '';
        if ($create && file_exists($abs)) {
            throw new \InvalidArgumentException('Document already exists.');
        }
        if (!$create && !is_file($abs)) {
            throw new \InvalidArgumentException('Document not found.');
        }
        if (!$create && $contentBase64 === '') {
            throw new \InvalidArgumentException('content_base64 is required when updating.');
        }
        if ($contentBase64 === '') {
            $bytes = '';
        } else {
            $bytes = base64_decode($contentBase64, true);
            if (!is_string($bytes)) {
                throw new \InvalidArgumentException('content_base64 is invalid.');
            }
        }
        if (@file_put_contents($abs, $bytes) === false) {
            throw new \RuntimeException('Could not save document.');
        }

        return [
            'ok' => true,
            'path' => $path,
            'bytes' => strlen($bytes),
        ];
    }

    /**
     * @param array<string, mixed> $params
     *
     * @return array{items: list<array<string,mixed>>}
     */
    private static function notesList(string $username, array $params): array
    {
        $all = self::readAllNotes($username);
        $archived = self::toBool($params['archived'] ?? null);
        $notebookFilter = isset($params['notebook']) && is_string($params['notebook']) ? trim($params['notebook']) : '';
        $q = isset($params['q']) && is_string($params['q']) ? strtolower(trim($params['q'])) : '';
        $items = [];
        foreach ($all as $note) {
            if ($archived !== null && $note['archived'] !== $archived) {
                continue;
            }
            if ($notebookFilter !== '' && $note['notebook'] !== $notebookFilter) {
                continue;
            }
            if (
                $q !== ''
                && !str_contains(strtolower((string) $note['title']), $q)
                && !str_contains(strtolower((string) $note['body']), $q)
                && !str_contains(strtolower(implode(',', $note['tags'])), $q)
            ) {
                continue;
            }
            $items[] = $note;
        }
        usort(
            $items,
            static fn (array $a, array $b): int => strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''))
        );

        return ['items' => array_values($items)];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private static function notesUpsert(string $username, ?string $pathId, array $body): array
    {
        $id = $pathId !== null ? self::sanitizeNoteId($pathId) : self::sanitizeNoteId((string) ($body['id'] ?? ('n'.(string) time())));
        $notebook = self::sanitizeNotebook((string) ($body['notebook'] ?? 'General'));
        $archived = self::toBool($body['archived'] ?? false) ?? false;
        $title = trim((string) ($body['title'] ?? 'Untitled'));
        $tags = self::normalizeTags($body['tags'] ?? []);
        $bodyText = (string) ($body['body'] ?? '');
        $starred = self::toBool($body['starred'] ?? null);
        $targetPath = self::notePath($username, $notebook, $id, $archived);
        @mkdir(dirname($targetPath), 0775, true);
        $markdown = self::serializeNoteMarkdown($title !== '' ? $title : 'Untitled', $tags, $starred, $bodyText);
        if (file_put_contents($targetPath, $markdown, LOCK_EX) === false) {
            throw new \RuntimeException('Could not save note.');
        }

        return [
            'ok' => true,
            'item' => self::readSingleNoteFromPath($targetPath, $username, $notebook, $id, $archived),
        ];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private static function notesDelete(string $username, string $id, array $body): array
    {
        $noteId = self::sanitizeNoteId($id);
        $notebook = isset($body['notebook']) && is_string($body['notebook']) ? self::sanitizeNotebook($body['notebook']) : null;
        $archived = self::toBool($body['archived'] ?? null);
        $location = self::findNotePath($username, $noteId, $notebook, $archived);
        if ($location === null) {
            throw new \InvalidArgumentException('Note not found.');
        }
        if (!@unlink($location['path'])) {
            throw new \RuntimeException('Could not delete note.');
        }

        return ['ok' => true];
    }

    /**
     * @return array<string, mixed>
     */
    private static function notesMoveArchiveState(string $username, string $id, bool $toArchived): array
    {
        $noteId = self::sanitizeNoteId($id);
        $from = self::findNotePath($username, $noteId, null, !$toArchived);
        if ($from === null) {
            throw new \InvalidArgumentException('Note not found.');
        }
        $to = self::notePath($username, $from['notebook'], $noteId, $toArchived);
        @mkdir(dirname($to), 0775, true);
        if (!@rename($from['path'], $to)) {
            if (copy($from['path'], $to)) {
                @unlink($from['path']);
            } else {
                throw new \RuntimeException('Could not move note.');
            }
        }

        return [
            'ok' => true,
            'item' => self::readSingleNoteFromPath($to, $username, $from['notebook'], $noteId, $toArchived),
        ];
    }

    /**
     * @return array{items:list<array{name:string,activeCount:int,archivedCount:int}>}
     */
    private static function notesNotebooks(string $username): array
    {
        $all = self::readAllNotes($username);
        $byName = [];
        foreach ($all as $item) {
            $name = (string) ($item['notebook'] ?? '');
            if ($name === '') {
                continue;
            }
            if (!isset($byName[$name])) {
                $byName[$name] = ['name' => $name, 'activeCount' => 0, 'archivedCount' => 0];
            }
            if (($item['archived'] ?? false) === true) {
                $byName[$name]['archivedCount']++;
            } else {
                $byName[$name]['activeCount']++;
            }
        }
        ksort($byName);

        return ['items' => array_values($byName)];
    }

    /**
     * @param array<string,mixed> $body
     *
     * @return array<string,mixed>
     */
    private static function notesNotebookCreate(string $username, array $body): array
    {
        $name = self::sanitizeNotebook((string) ($body['name'] ?? ''));
        $activePath = self::notebookPath($username, $name, false);
        if (is_dir($activePath)) {
            throw new \InvalidArgumentException('Notebook already exists.');
        }
        if (!@mkdir($activePath, 0775, true) && !is_dir($activePath)) {
            throw new \RuntimeException('Could not create notebook.');
        }

        return ['ok' => true, 'name' => $name];
    }

    /**
     * @param array<string,mixed> $body
     *
     * @return array<string,mixed>
     */
    private static function notesNotebookRename(string $username, string $name, array $body): array
    {
        $from = self::sanitizeNotebook($name);
        $to = self::sanitizeNotebook((string) ($body['name'] ?? ''));
        if ($from === $to) {
            return ['ok' => true, 'from' => $from, 'to' => $to];
        }
        foreach ([false, true] as $archived) {
            $source = self::notebookPath($username, $from, $archived);
            $target = self::notebookPath($username, $to, $archived);
            if (!is_dir($source)) {
                continue;
            }
            if (is_dir($target)) {
                throw new \InvalidArgumentException('Destination notebook already exists.');
            }
            @mkdir(dirname($target), 0775, true);
            if (!@rename($source, $target)) {
                throw new \RuntimeException('Could not rename notebook.');
            }
        }

        return ['ok' => true, 'from' => $from, 'to' => $to];
    }

    /**
     * @param array<string,mixed> $body
     *
     * @return array<string,mixed>
     */
    private static function notesNotebookDelete(string $username, string $name, array $body): array
    {
        $notebook = self::sanitizeNotebook($name);
        $mode = isset($body['mode']) && is_string($body['mode']) ? strtolower(trim($body['mode'])) : 'archive';
        if (!in_array($mode, ['archive', 'move', 'purge'], true)) {
            throw new \InvalidArgumentException('Invalid notebook delete mode.');
        }
        if ($mode === 'move') {
            $target = self::sanitizeNotebook((string) ($body['target'] ?? ''));
            if ($target === $notebook) {
                throw new \InvalidArgumentException('Target notebook must be different.');
            }
            foreach ([false, true] as $archived) {
                $sourceDir = self::notebookPath($username, $notebook, $archived);
                if (!is_dir($sourceDir)) {
                    continue;
                }
                $targetDir = self::notebookPath($username, $target, $archived);
                @mkdir($targetDir, 0775, true);
                self::moveMarkdownFiles($sourceDir, $targetDir);
                self::removeDirIfEmpty($sourceDir);
            }

            return ['ok' => true, 'mode' => 'move', 'target' => $target];
        }
        if ($mode === 'archive') {
            $sourceDir = self::notebookPath($username, $notebook, false);
            if (is_dir($sourceDir)) {
                $archiveDir = self::notebookPath($username, $notebook, true);
                @mkdir($archiveDir, 0775, true);
                self::moveMarkdownFiles($sourceDir, $archiveDir);
                self::removeDirIfEmpty($sourceDir);
            }

            return ['ok' => true, 'mode' => 'archive'];
        }

        foreach ([false, true] as $archived) {
            self::removeNotebookCompletely(self::notebookPath($username, $notebook, $archived));
        }

        return ['ok' => true, 'mode' => 'purge'];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function readAllNotes(string $username): array
    {
        $out = [];
        foreach ([false, true] as $archived) {
            $root = self::notesBasePath($username, $archived);
            if (!is_dir($root)) {
                continue;
            }
            $notebooks = scandir($root);
            if (!is_array($notebooks)) {
                continue;
            }
            foreach ($notebooks as $notebook) {
                if ($notebook === '.' || $notebook === '..') {
                    continue;
                }
                if (!$archived && $notebook === '.archive') {
                    continue;
                }
                $nbPath = $root.'/'.$notebook;
                if (!is_dir($nbPath)) {
                    continue;
                }
                $files = scandir($nbPath);
                if (!is_array($files)) {
                    continue;
                }
                foreach ($files as $file) {
                    if (!str_ends_with(strtolower($file), '.md')) {
                        continue;
                    }
                    $id = substr($file, 0, -3);
                    if (!is_string($id) || $id === '') {
                        continue;
                    }
                    $note = self::readSingleNoteFromPath($nbPath.'/'.$file, $username, $notebook, $id, $archived);
                    $out[] = $note;
                }
            }
        }

        return $out;
    }

    /**
     * @return array{path:string, notebook:string, archived:bool}|null
     */
    private static function findNotePath(string $username, string $id, ?string $notebook, ?bool $archived): ?array
    {
        $candidates = [];
        $archivedOptions = $archived === null ? [false, true] : [$archived];
        foreach ($archivedOptions as $isArchived) {
            if ($notebook !== null) {
                $candidates[] = [
                    'path' => self::notePath($username, $notebook, $id, $isArchived),
                    'notebook' => $notebook,
                    'archived' => $isArchived,
                ];
                continue;
            }
            $root = self::notesBasePath($username, $isArchived);
            if (!is_dir($root)) {
                continue;
            }
            $entries = scandir($root);
            if (!is_array($entries)) {
                continue;
            }
            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }
                if (!$isArchived && $entry === '.archive') {
                    continue;
                }
                if (!is_dir($root.'/'.$entry)) {
                    continue;
                }
                $candidates[] = [
                    'path' => self::notePath($username, $entry, $id, $isArchived),
                    'notebook' => $entry,
                    'archived' => $isArchived,
                ];
            }
        }
        foreach ($candidates as $candidate) {
            if (is_file($candidate['path'])) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private static function readSingleNoteFromPath(string $path, string $username, string $notebook, string $id, bool $archived): array
    {
        $raw = is_readable($path) ? (string) file_get_contents($path) : '';
        [$title, $tags, $starred, $body] = self::parseNoteMarkdown($raw, $id);
        $mtime = is_file($path) ? (int) filemtime($path) : time();

        return [
            'id' => $id,
            'username' => $username,
            'notebook' => $notebook,
            'title' => $title,
            'body' => $body,
            'tags' => $tags,
            'starred' => $starred,
            'archived' => $archived,
            'updatedAt' => date('c', $mtime),
        ];
    }

    private static function notePath(string $username, string $notebook, string $id, bool $archived): string
    {
        return self::notesBasePath($username, $archived).'/'.$notebook.'/'.$id.'.md';
    }

    private static function notebookPath(string $username, string $notebook, bool $archived): string
    {
        return self::notesBasePath($username, $archived).'/'.$notebook;
    }

    private static function notesBasePath(string $username, bool $archived): string
    {
        $base = rtrim(Paths::data(), '/').'/files/users/'.$username.'/.notes';

        return $archived ? $base.'/.archive' : $base;
    }

    private static function sanitizeNoteId(string $id): string
    {
        $trimmed = trim($id);
        if ($trimmed === '' || preg_match('/^[A-Za-z0-9._-]{1,120}$/', $trimmed) !== 1) {
            throw new \InvalidArgumentException('Invalid note id.');
        }

        return $trimmed;
    }

    private static function sanitizeNotebook(string $notebook): string
    {
        $trimmed = trim($notebook);
        if ($trimmed === '' || str_contains($trimmed, '/') || str_contains($trimmed, '\\') || str_contains($trimmed, "\0") || str_contains($trimmed, '..')) {
            throw new \InvalidArgumentException('Invalid notebook name.');
        }

        return $trimmed;
    }

    /**
     * @param mixed $value
     *
     * @return list<string>
     */
    private static function normalizeTags(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $tag) {
            if (!is_string($tag)) {
                continue;
            }
            $normalized = strtolower(trim(str_replace(["\r", "\n"], ' ', $tag)));
            if ($normalized === '') {
                continue;
            }
            $out[$normalized] = true;
        }

        return array_keys($out);
    }

    /**
     * @return array{0:string,1:list<string>,2:bool|null,3:string}
     */
    private static function parseNoteMarkdown(string $markdown, string $fallbackTitle): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $markdown);
        $token = "\n----\n";
        $idx = strpos($normalized, $token);
        $headerText = $idx !== false ? substr($normalized, 0, $idx) : '';
        $body = $idx !== false ? substr($normalized, $idx + strlen($token)) : $normalized;
        $title = $fallbackTitle;
        $tags = [];
        $starred = null;
        foreach (array_filter(array_map('trim', explode("\n", $headerText))) as $line) {
            $sep = strpos($line, ':');
            if ($sep === false || $sep <= 0) {
                continue;
            }
            $key = strtolower(trim(substr($line, 0, $sep)));
            $value = trim(substr($line, $sep + 1));
            if ($key === 'title') {
                $title = $value !== '' ? $value : $fallbackTitle;
                continue;
            }
            if ($key === 'tags') {
                $tags = self::normalizeTags(explode(',', $value));
                continue;
            }
            if ($key === 'starred') {
                $starred = self::toBool($value);
            }
        }

        return [$title, $tags, $starred, $body];
    }

    private static function serializeNoteMarkdown(string $title, array $tags, ?bool $starred, string $body): string
    {
        $lines = [
            'title: '.trim(str_replace("\n", ' ', $title)),
            'tags: '.implode(', ', $tags),
        ];
        if ($starred !== null) {
            $lines[] = 'starred: '.($starred ? 'true' : 'false');
        }
        $normalizedBody = str_replace(["\r\n", "\r"], "\n", $body);

        return implode("\n", $lines)."\n----\n".$normalizedBody;
    }

    /**
     * @param mixed $value
     */
    private static function toBool(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            $lower = strtolower(trim($value));
            if (in_array($lower, ['1', 'true', 'yes', 'on'], true)) {
                return true;
            }
            if (in_array($lower, ['0', 'false', 'no', 'off'], true)) {
                return false;
            }
        }
        if (is_int($value)) {
            return $value === 1 ? true : ($value === 0 ? false : null);
        }

        return null;
    }

    private static function moveMarkdownFiles(string $sourceDir, string $targetDir): void
    {
        $entries = scandir($sourceDir);
        if (!is_array($entries)) {
            throw new \RuntimeException('Could not read notebook directory.');
        }
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $from = $sourceDir.'/'.$entry;
            if (!is_file($from) || !str_ends_with(strtolower($entry), '.md')) {
                continue;
            }
            $to = $targetDir.'/'.$entry;
            if (is_file($to)) {
                throw new \InvalidArgumentException('Target notebook already contains note '.$entry.'.');
            }
            if (!@rename($from, $to)) {
                if (copy($from, $to)) {
                    @unlink($from);
                } else {
                    throw new \RuntimeException('Could not move notebook notes.');
                }
            }
        }
    }

    private static function removeDirIfEmpty(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $entries = scandir($dir);
        if (!is_array($entries)) {
            return;
        }
        foreach ($entries as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                return;
            }
        }
        @rmdir($dir);
    }

    private static function removeNotebookCompletely(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $entries = scandir($dir);
        if (!is_array($entries)) {
            throw new \RuntimeException('Could not read notebook directory.');
        }
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir.'/'.$entry;
            if (is_file($path) && str_ends_with(strtolower($entry), '.md')) {
                @unlink($path);
            }
        }
        self::removeDirIfEmpty($dir);
    }
}
