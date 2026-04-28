<?php

declare(strict_types=1);

namespace App\Admin;

use App\Config;
use App\Installer\WebBase;
use App\SabreUiAuthGate;
use App\Settings\SettingsDefaults;
use App\Settings\SettingsKeys;
use App\Settings\SettingsRepository;
use App\Update\UpdateManager;
use App\Update\UpdateStateStore;

/**
 * Serves the Cloud Harmony admin web UI at {@code /admin/} with the same admin group policy as legacy admin pages.
 *
 * Source: {@code packages/admin-ui/}; build output: {@code wgw-modules/admin/dist/}.
 */
final class AdminUiKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/admin');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        $adminNoSlash = WebBase::url($webBase, '/admin');
        if ($path === $adminNoSlash) {
            self::redirectTo($webBase, '/admin/');

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
            $adminUser = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);
            if (!AdminPolicy::isAdmin($pdo, $adminUser)) {
                http_response_code(403);
                header('Content-Type: text/html; charset=utf-8');
                echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Forbidden</title></head><body>'
                    .'<h1>403 Forbidden</h1><p>Your account is authenticated but is not allowed to use the admin area.</p>'
                    .'<p>Add this user as a member of the <code>principals/groups/administrators</code> group under <strong>Groups</strong>.</p>'
                    .'</body></html>';

                return true;
            }
        } catch (\Throwable) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Could not load configuration or database.';

            return true;
        }

        if (self::tryRespondApi($webBase, $path, $pdo, $adminUser)) {
            return true;
        }

        if (!AdminUiStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        if (AdminUiStatic::tryServe($webBase, $path)) {
            return true;
        }

        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';

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
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin</title>';
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Admin</h1>';
        echo '<p>The Admin UI build is missing. From the project root, run <code>pnpm --filter @wgw/admin-ui build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/admin-ui/</code>; the Vite build writes to <code>wgw-modules/admin/dist/</code>.</p>';
        echo '<p class="hint">Open <code>'.htmlspecialchars(WebBase::url($webBase, '/admin/'), ENT_QUOTES, 'UTF-8').'</code> after authenticating as an admin user.</p>';
        echo '</body></html>';
    }

    private static function tryRespondApi(string $webBase, string $path, \PDO $pdo, string $adminUser): bool
    {
        $apiPrefix = WebBase::url($webBase, '/admin/api');
        if ($path !== $apiPrefix && !str_starts_with($path, $apiPrefix.'/')) {
            return false;
        }
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $rel = $path === $apiPrefix ? '' : substr($path, strlen($apiPrefix) + 1);
        $rel = trim((string) $rel, '/');

        try {
            if ($method === 'GET' && $rel === 'state') {
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'GET' && $rel === 'updates/state') {
                self::json(200, UpdateManager::getState($pdo));

                return true;
            }
            if ($method === 'GET' && $rel === 'updates/log') {
                self::json(200, ['lines' => UpdateStateStore::readLog()]);

                return true;
            }

            $body = $method === 'POST' ? self::readJsonBody() : [];
            if ($method === 'POST') {
                self::requireCsrf($body, $adminUser);
            }
            if ($method === 'POST' && $rel === 'users/create') {
                self::handleCreateUser($pdo, $body);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'users/update') {
                self::handleUpdateUser($pdo, $body, $adminUser);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'users/delete') {
                self::handleDeleteUser($pdo, $body, $adminUser);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'groups/create') {
                self::handleCreateGroup($pdo, $body);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'groups/update') {
                self::handleUpdateGroup($pdo, $body);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'groups/delete') {
                self::handleDeleteGroup($pdo, $body);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'membership/set') {
                self::handleSetMembership($pdo, $body, $adminUser);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'settings/save') {
                self::handleSaveSettings($pdo, $body);
                self::json(200, self::buildState($webBase, $pdo, $adminUser));

                return true;
            }
            if ($method === 'POST' && $rel === 'updates/check') {
                self::json(200, UpdateManager::check($pdo, self::updateFeedUrl()));

                return true;
            }
            if ($method === 'POST' && $rel === 'updates/apply') {
                self::json(200, UpdateManager::apply($pdo, $body));

                return true;
            }
        } catch (\InvalidArgumentException $e) {
            self::json(400, ['error' => $e->getMessage()]);

            return true;
        } catch (\Throwable $e) {
            error_log('Admin API error: '.$e->getMessage());
            self::json(500, ['error' => 'Internal server error.']);

            return true;
        }

        self::json(404, ['error' => 'Not found']);

        return true;
    }

    /**
     * @return array{
     *   users: list<array{id: string, username: string, email: string, displayName: string, groups: list<string>, createdAt: string}>,
     *   groups: list<array{id: string, name: string, displayName: string}>,
     *   mail: array{imapHost: string, imapPort: int, imapSecurity: string, smtpHost: string, smtpPort: int, smtpSecurity: string},
     *   voice: array{signalingUrl: string, stunUrls: string, turnUrls: string, turnUsername: string, turnPassword: string, forceRelay: bool},
     *   apps: array{calendars: bool, contacts: bool},
     *   webdav: array{sabreUi: bool, timezone: string, baseUri: string, authRealm: string},
     *   updates: array<string, mixed>,
     *   currentUser: string,
     *   logoutUrl: string,
     *   csrf: string
     * }
     */
    private static function buildState(string $webBase, \PDO $pdo, string $adminUser): array
    {
        $usersRaw = UserProvisioner::listUsers($pdo);
        $groupsRaw = GroupManager::listCollections($pdo, AdminConstants::GROUP_PREFIX);
        $groupMembers = [];
        foreach ($groupsRaw as $g) {
            $groupMembers[$g['uri']] = GroupManager::getMembers($pdo, $g['uri']);
        }

        $users = [];
        foreach ($usersRaw as $u) {
            $principal = 'principals/'.$u['username'];
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
            $groups[] = [
                'id' => (string) $g['uri'],
                'name' => basename((string) $g['uri']),
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
            'csrf' => AdminNonce::issue($adminUser),
        ];
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
     * @param array<string, mixed> $body
     */
    private static function handleCreateUser(\PDO $pdo, array $body): void
    {
        $username = strtolower(trim((string) ($body['username'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $displayName = trim((string) ($body['displayName'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $groups = self::toStringList($body['groups'] ?? []);

        UserProvisioner::create(
            $pdo,
            $username,
            $password,
            $displayName !== '' ? $displayName : $username,
            $email !== '' ? $email : null,
        );
        self::setUserGroups($pdo, $username, $groups);
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleUpdateUser(\PDO $pdo, array $body, string $adminUser): void
    {
        $username = strtolower(trim((string) ($body['username'] ?? '')));
        if ($username === '') {
            throw new \InvalidArgumentException('Username is required.');
        }
        $displayName = trim((string) ($body['displayName'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $groups = self::toStringList($body['groups'] ?? []);

        if (UserProvisioner::hasPrincipal($pdo, $username)) {
            UserProvisioner::updateProfile($pdo, $username, $displayName, $email !== '' ? $email : null);
        }
        if ($password !== '') {
            UserProvisioner::updatePassword($pdo, $username, $password);
        }
        self::setUserGroups($pdo, $username, $groups, $adminUser);
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleDeleteUser(\PDO $pdo, array $body, string $adminUser): void
    {
        $username = strtolower(trim((string) ($body['username'] ?? '')));
        if ($username === '' || $username === $adminUser) {
            throw new \InvalidArgumentException('Cannot delete this user.');
        }
        UserProvisioner::delete($pdo, $username);
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleCreateGroup(\PDO $pdo, array $body): void
    {
        $name = strtolower(trim((string) ($body['name'] ?? '')));
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{0,62}$/', $name)) {
            throw new \InvalidArgumentException('Invalid group name.');
        }
        $displayName = trim((string) ($body['displayName'] ?? ''));
        GroupManager::createPrincipal(
            $pdo,
            AdminConstants::GROUP_PREFIX.$name,
            $displayName !== '' ? $displayName : null
        );
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleUpdateGroup(\PDO $pdo, array $body): void
    {
        $groupId = trim((string) ($body['groupId'] ?? ''));
        $displayName = trim((string) ($body['displayName'] ?? ''));
        if (!str_starts_with($groupId, AdminConstants::GROUP_PREFIX)) {
            throw new \InvalidArgumentException('Invalid group.');
        }
        $stmt = $pdo->prepare('UPDATE principals SET displayname = ? WHERE uri = ?');
        $stmt->execute([$displayName !== '' ? $displayName : null, $groupId]);
        if ($stmt->rowCount() === 0) {
            throw new \InvalidArgumentException('Group not found.');
        }
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleDeleteGroup(\PDO $pdo, array $body): void
    {
        $groupId = trim((string) ($body['groupId'] ?? ''));
        if (!str_starts_with($groupId, AdminConstants::GROUP_PREFIX)) {
            throw new \InvalidArgumentException('Invalid group.');
        }
        if ($groupId === AdminConstants::ADMIN_GROUP_URI) {
            throw new \InvalidArgumentException('The administrators group cannot be deleted.');
        }
        GroupManager::deleteCollection($pdo, $groupId);
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleSetMembership(\PDO $pdo, array $body, string $adminUser): void
    {
        $username = strtolower(trim((string) ($body['username'] ?? '')));
        $groupId = trim((string) ($body['groupId'] ?? ''));
        $enabled = (bool) ($body['enabled'] ?? false);
        if ($username === '' || !str_starts_with($groupId, AdminConstants::GROUP_PREFIX)) {
            throw new \InvalidArgumentException('Invalid membership input.');
        }
        if ($groupId === AdminConstants::ADMIN_GROUP_URI && $username === $adminUser && !$enabled) {
            throw new \InvalidArgumentException('You cannot remove your own administrator access.');
        }

        $members = GroupManager::getMembers($pdo, $groupId);
        $principal = 'principals/'.$username;
        if ($enabled && !in_array($principal, $members, true)) {
            $members[] = $principal;
        }
        if (!$enabled) {
            $members = array_values(array_filter($members, static fn (string $m): bool => $m !== $principal));
        }
        GroupManager::setMembers($pdo, $groupId, $members);
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function handleSaveSettings(\PDO $pdo, array $body): void
    {
        $mail = is_array($body['mail'] ?? null) ? $body['mail'] : [];
        $voice = is_array($body['voice'] ?? null) ? $body['voice'] : [];
        $apps = is_array($body['apps'] ?? null) ? $body['apps'] : [];
        $webdav = is_array($body['webdav'] ?? null) ? $body['webdav'] : [];

        $voiceTurnUrls = array_merge(
            self::normalizeLines((string) ($voice['stunUrls'] ?? '')),
            self::normalizeLines((string) ($voice['turnUrls'] ?? '')),
        );

        $patch = [
            SettingsKeys::MAIL_IMAP_HOST => trim((string) ($mail['imapHost'] ?? '')),
            SettingsKeys::MAIL_IMAP_PORT => max(1, min(65535, (int) ($mail['imapPort'] ?? 993))),
            SettingsKeys::MAIL_IMAP_SECURITY => self::normalizeMailSecurity((string) ($mail['imapSecurity'] ?? 'ssl')),
            SettingsKeys::MAIL_SMTP_HOST => trim((string) ($mail['smtpHost'] ?? '')),
            SettingsKeys::MAIL_SMTP_PORT => max(1, min(65535, (int) ($mail['smtpPort'] ?? 465))),
            SettingsKeys::MAIL_SMTP_SECURITY => self::normalizeMailSecurity((string) ($mail['smtpSecurity'] ?? 'ssl')),
            SettingsKeys::VOICE_SIGNALING_URL => trim((string) ($voice['signalingUrl'] ?? '')),
            SettingsKeys::VOICE_TURN_URL => implode(', ', $voiceTurnUrls),
            SettingsKeys::VOICE_TURN_USERNAME => trim((string) ($voice['turnUsername'] ?? '')),
            SettingsKeys::VOICE_TURN_CREDENTIAL => (string) ($voice['turnPassword'] ?? ''),
            SettingsKeys::VOICE_FORCE_RELAY => (bool) ($voice['forceRelay'] ?? false),
            SettingsKeys::BROWSER_PLUGIN => (bool) ($webdav['sabreUi'] ?? true),
            SettingsKeys::TIMEZONE => trim((string) ($webdav['timezone'] ?? 'UTC')) ?: 'UTC',
            SettingsKeys::BASE_URI => SettingsDefaults::normalizeBaseUri((string) ($webdav['baseUri'] ?? '/')),
            SettingsKeys::AUTH_REALM => trim((string) ($webdav['authRealm'] ?? 'SabreDAV')) ?: 'SabreDAV',
            SettingsKeys::CALENDAR_ENABLED => (bool) ($apps['calendars'] ?? true),
            SettingsKeys::CONTACTS_ENABLED => (bool) ($apps['contacts'] ?? true),
        ];
        $cfgCurrent = SettingsDefaults::normalize(SettingsRepository::fetchAll($pdo));
        $filesEnabled = (bool) ($cfgCurrent[SettingsKeys::FILES_ENABLED] ?? true);
        if (!$filesEnabled && !$patch[SettingsKeys::CALENDAR_ENABLED] && !$patch[SettingsKeys::CONTACTS_ENABLED]) {
            throw new \InvalidArgumentException('Enable at least one of files, calendars, or contacts.');
        }
        SettingsRepository::replaceManyDriver($pdo, $patch);
        Config::resetCache();
    }

    /**
     * @return list<string>
     */
    private static function normalizeLines(string $raw): array
    {
        $out = [];
        foreach (preg_split('/[\r\n,]+/', $raw) ?: [] as $line) {
            $v = trim((string) $line);
            if ($v !== '') {
                $out[] = $v;
            }
        }

        return $out;
    }

    private static function normalizeMailSecurity(string $s): string
    {
        $s = strtolower(trim($s));

        return in_array($s, ['ssl', 'starttls', 'none'], true) ? $s : 'ssl';
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function requireCsrf(array $body, string $adminUser): void
    {
        $token = isset($body['csrf']) && is_string($body['csrf']) ? $body['csrf'] : null;
        if (!AdminNonce::validate($token, $adminUser)) {
            throw new \InvalidArgumentException('Invalid or expired security token. Refresh and try again.');
        }
    }

    private static function updateFeedUrl(): string
    {
        $env = getenv('WGW_UPDATE_FEED_URL');
        if (is_string($env) && trim($env) !== '') {
            return trim($env);
        }

        try {
            $cfg = Config::loadFileOnly();
            if (isset($cfg['update_feed_url']) && is_string($cfg['update_feed_url'])) {
                $value = trim($cfg['update_feed_url']);
                if ($value !== '') {
                    return $value;
                }
            }
        } catch (\Throwable) {
            // Fallback below.
        }

        return '';
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
     * @param array<string, mixed> $payload
     */
    private static function json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo (string) json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
