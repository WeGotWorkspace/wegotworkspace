<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Admin\AdminConstants;
use App\Support\AppPaths;
use Sabre\CalDAV\Backend\PDO as CalPDO;
use Sabre\CalDAV\Xml\Property\SupportedCalendarComponentSet;
use Sabre\CardDAV\Backend\PDO as CardPDO;

final class InstallerSeeder
{
    public function __construct(private AppPaths $paths) {}

    public function seed(
        \PDO $pdo,
        string $username,
        string $password,
        string $displayName,
        ?string $email,
        bool $enableCalendars,
        bool $enableContacts,
    ): void {
        $email = $email !== null && $email !== '' ? $email : $username.'@localhost';
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Password hashing failed.');
        }

        $pdo->prepare('INSERT INTO users (username, digesta1, digest) VALUES (?, ?, ?)')
            ->execute([$username, '', $hash]);

        $principalUri = 'principals/'.$username;
        $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, ?, ?)')
            ->execute([$principalUri, $email, $displayName]);

        if ($enableCalendars) {
            $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, NULL, NULL)')
                ->execute([$principalUri.'/calendar-proxy-read']);
            $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, NULL, NULL)')
                ->execute([$principalUri.'/calendar-proxy-write']);

            $caldav = new CalPDO($pdo);
            $caldav->createCalendar($principalUri, 'default', [
                '{DAV:}displayname' => 'Calendar',
                '{urn:ietf:params:xml:ns:caldav}supported-calendar-component-set' => new SupportedCalendarComponentSet(['VEVENT', 'VTODO', 'VJOURNAL']),
            ]);
        }

        if ($enableContacts) {
            $carddav = new CardPDO($pdo);
            $carddav->createAddressBook($principalUri, 'default', [
                '{DAV:}displayname' => 'Address book',
            ]);
        }

        $this->ensureUserFilesDirectory($username);
        $this->joinAdminGroup($pdo, $principalUri);
    }

    public function ensureGroupsContainerPrincipal(\PDO $pdo): void
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $sql = $driver === 'mysql'
            ? 'INSERT IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)'
            : 'INSERT OR IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)';
        $pdo->prepare($sql)->execute([AdminConstants::GROUP_CONTAINER_URI, 'Groups']);
    }

    private function joinAdminGroup(\PDO $pdo, string $memberPrincipalUri): void
    {
        $this->ensureGroupsContainerPrincipal($pdo);

        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $sql = $driver === 'mysql'
            ? 'INSERT IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)'
            : 'INSERT OR IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)';
        $pdo->prepare($sql)->execute([AdminConstants::ADMIN_GROUP_URI, 'Administrators']);
        $this->ensureGroupFilesDirectory('administrators');

        $q = $pdo->prepare('SELECT id FROM principals WHERE uri = ?');
        $q->execute([AdminConstants::ADMIN_GROUP_URI]);
        $groupId = $q->fetchColumn();
        $q->execute([$memberPrincipalUri]);
        $memberPrincipalId = $q->fetchColumn();
        if ($groupId === false || $memberPrincipalId === false) {
            return;
        }
        try {
            $pdo->prepare('INSERT INTO groupmembers (principal_id, member_id) VALUES (?, ?)')
                ->execute([(int) $groupId, (int) $memberPrincipalId]);
        } catch (\PDOException) {
            // duplicate membership
        }
    }

    private function ensureUserFilesDirectory(string $username): void
    {
        $path = rtrim($this->paths->dataDir(), '/').'/files/users/'.$username;
        if (is_dir($path)) {
            return;
        }
        if (! @mkdir($path, 0775, true) && ! is_dir($path)) {
            throw new \RuntimeException('Could not create user files directory for '.$username.'.');
        }
    }

    private function ensureGroupFilesDirectory(string $groupName): void
    {
        $path = rtrim($this->paths->dataDir(), '/').'/files/groups/'.$groupName;
        if (is_dir($path)) {
            return;
        }
        if (! @mkdir($path, 0775, true) && ! is_dir($path)) {
            throw new \RuntimeException('Could not create group files directory for '.$groupName.'.');
        }
    }
}
