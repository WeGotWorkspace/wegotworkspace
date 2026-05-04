<?php

declare(strict_types=1);

namespace App\Installer;

use App\Admin\AdminConstants;
use App\Paths;
use Sabre\CalDAV\Backend\PDO as CalPDO;
use Sabre\CalDAV\Xml\Property\SupportedCalendarComponentSet;
use Sabre\CardDAV\Backend\PDO as CardPDO;

final class Seeder
{
    /**
     * Ensures {@see AdminConstants::GROUP_CONTAINER_URI} exists so the DAV tree can resolve
     * {@code principals/groups/…} paths (Sabre walks one URI segment per collection).
     */
    public static function ensureGroupsContainerPrincipal(\PDO $pdo): void
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $pdo->prepare('INSERT IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)');
        } else {
            $stmt = $pdo->prepare('INSERT OR IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)');
        }
        $stmt->execute([AdminConstants::GROUP_CONTAINER_URI, 'Groups']);
    }

    public static function seed(
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
        $u = $pdo->prepare('INSERT INTO users (username, digesta1, digest) VALUES (?, ?, ?)');
        $u->execute([$username, '', $hash]);

        $principalUri = 'principals/'.$username;

        $p = $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, ?, ?)');
        $p->execute([$principalUri, $email, $displayName]);

        if ($enableCalendars) {
            $p->execute([$principalUri.'/calendar-proxy-read', null, null]);
            $p->execute([$principalUri.'/calendar-proxy-write', null, null]);

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

        self::ensureUserFilesDirectory($username);
        self::joinAdminGroup($pdo, $principalUri);
    }

    /**
     * Add a user principal to the built-in administrators group (used for /admin access).
     */
    public static function joinAdminGroup(\PDO $pdo, string $memberPrincipalUri): void
    {
        self::ensureGroupsContainerPrincipal($pdo);

        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $pdo->prepare('INSERT IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)');
        } else {
            $stmt = $pdo->prepare('INSERT OR IGNORE INTO principals (uri, email, displayname) VALUES (?, NULL, ?)');
        }
        $stmt->execute([AdminConstants::ADMIN_GROUP_URI, 'Administrators']);
        self::ensureGroupFilesDirectory('administrators');

        $q = $pdo->prepare('SELECT id FROM principals WHERE uri = ?');
        $q->execute([AdminConstants::ADMIN_GROUP_URI]);
        $groupId = $q->fetchColumn();
        $q->execute([$memberPrincipalUri]);
        $memberPrincipalId = $q->fetchColumn();
        if ($groupId === false || $memberPrincipalId === false) {
            return;
        }
        $ins = $pdo->prepare('INSERT INTO groupmembers (principal_id, member_id) VALUES (?, ?)');
        try {
            $ins->execute([(int) $groupId, (int) $memberPrincipalId]);
        } catch (\PDOException) {
            // duplicate membership
        }
    }

    private static function ensureUserFilesDirectory(string $username): void
    {
        $path = Paths::data().'/files/users/'.$username;
        if (is_dir($path)) {
            return;
        }
        if (!@mkdir($path, 0775, true) && !is_dir($path)) {
            throw new \RuntimeException('Could not create user files directory for '.$username.'.');
        }
    }

    private static function ensureGroupFilesDirectory(string $groupName): void
    {
        $groupName = trim($groupName);
        if ($groupName === '') {
            throw new \RuntimeException('Group name cannot be empty when creating group files directory.');
        }
        $path = Paths::data().'/files/groups/'.$groupName;
        if (is_dir($path)) {
            return;
        }
        if (!@mkdir($path, 0775, true) && !is_dir($path)) {
            throw new \RuntimeException('Could not create group files directory for '.$groupName.'.');
        }
    }
}
