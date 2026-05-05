<?php

declare(strict_types=1);

namespace App\Admin;

use App\Config;
use Sabre\CalDAV\Backend\PDO as CalPDO;
use Sabre\CalDAV\Xml\Property\SupportedCalendarComponentSet;
use Sabre\CardDAV\Backend\PDO as CardPDO;

final class UserProvisioner
{
    /**
     * @return list<array{username: string, email: ?string, displayname: ?string}>
     */
    public static function hasPrincipal(\PDO $pdo, string $username): bool
    {
        $stmt = $pdo->prepare('SELECT 1 FROM principals WHERE uri = ?');
        $stmt->execute(['principals/'.$username]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * @return list<array{username: string, email: ?string, displayname: ?string}>
     */
    public static function listUsers(\PDO $pdo): array
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $sql = 'SELECT u.username, p.email, p.displayname FROM users u
                LEFT JOIN principals p ON p.uri = CONCAT(\'principals/\', u.username)
                ORDER BY u.username ASC';
        } else {
            $sql = "SELECT u.username, p.email, p.displayname FROM users u
                LEFT JOIN principals p ON p.uri = ('principals/' || u.username)
                ORDER BY u.username ASC";
        }
        $stmt = $pdo->query($sql);
        if ($stmt === false) {
            return [];
        }
        $out = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $out[] = [
                'username' => (string) $row['username'],
                'email' => isset($row['email']) && $row['email'] !== null && $row['email'] !== '' ? (string) $row['email'] : null,
                'displayname' => isset($row['displayname']) && $row['displayname'] !== null && $row['displayname'] !== '' ? (string) $row['displayname'] : null,
            ];
        }

        return $out;
    }

    /**
     * @throws \InvalidArgumentException
     */
    public static function create(
        \PDO $pdo,
        string $username,
        string $password,
        string $displayName,
        ?string $email,
    ): void {
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{1,62}$/', $username)) {
            throw new \InvalidArgumentException('Username must be 2–63 characters: lowercase letters, digits, underscore, or hyphen.');
        }
        if (strlen($password) < 10) {
            throw new \InvalidArgumentException('Use a password of at least 10 characters.');
        }
        $cfg = Config::load();
        $check = $pdo->prepare('SELECT 1 FROM users WHERE username = ?');
        $check->execute([$username]);
        if ($check->fetchColumn()) {
            throw new \InvalidArgumentException('That username is already taken.');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Password hashing failed.');
        }
        $emailNorm = $email !== null && $email !== '' ? $email : $username.'@localhost';
        $pdo->prepare('INSERT INTO users (username, digesta1, digest) VALUES (?, ?, ?)')->execute([$username, '', $hash]);

        $cal = (bool) ($cfg['calendar_enabled'] ?? true);
        $card = (bool) ($cfg['contacts_enabled'] ?? true);

        $principalUri = 'principals/'.$username;
        $ins = $pdo->prepare('INSERT INTO principals (uri, email, displayname) VALUES (?, ?, ?)');
        $ins->execute([$principalUri, $emailNorm, $displayName !== '' ? $displayName : $username]);

        if ($cal) {
            $ins->execute([$principalUri.'/calendar-proxy-read', null, null]);
            $ins->execute([$principalUri.'/calendar-proxy-write', null, null]);
            $caldav = new CalPDO($pdo);
            $caldav->createCalendar($principalUri, 'default', [
                '{DAV:}displayname' => 'Calendar',
                '{urn:ietf:params:xml:ns:caldav}supported-calendar-component-set' => new SupportedCalendarComponentSet(['VEVENT', 'VTODO', 'VJOURNAL']),
            ]);
        }
        if ($card) {
            $carddav = new CardPDO($pdo);
            $carddav->createAddressBook($principalUri, 'default', [
                '{DAV:}displayname' => 'Address book',
            ]);
        }
    }

    public static function updatePassword(\PDO $pdo, string $username, string $password): void
    {
        if (strlen($password) < 10) {
            throw new \InvalidArgumentException('Use a password of at least 10 characters.');
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Password hashing failed.');
        }
        $stmt = $pdo->prepare('UPDATE users SET digest = ? WHERE username = ?');
        $stmt->execute([$hash, $username]);
        if ($stmt->rowCount() === 0) {
            throw new \InvalidArgumentException('User not found.');
        }
    }

    /**
     * @throws \InvalidArgumentException
     */
    public static function updateProfile(\PDO $pdo, string $username, string $displayName, ?string $email): void
    {
        $principalUri = 'principals/'.$username;
        $stmt = $pdo->prepare('UPDATE principals SET displayname = ?, email = ? WHERE uri = ?');
        $stmt->execute([
            $displayName !== '' ? $displayName : null,
            $email !== null && $email !== '' ? $email : null,
            $principalUri,
        ]);
        if ($stmt->rowCount() === 0) {
            throw new \InvalidArgumentException('No principal row for this user (contacts/calendars may be disabled).');
        }
    }

    public static function delete(\PDO $pdo, string $username): void
    {
        $principalUri = 'principals/'.$username;
        $q = $pdo->prepare('SELECT id FROM principals WHERE uri = ?');
        $q->execute([$principalUri]);
        $principalId = $q->fetchColumn();
        if ($principalId === false) {
            $pdo->prepare('DELETE FROM users WHERE username = ?')->execute([$username]);

            return;
        }
        $principalId = (int) $principalId;

        $caldav = new CalPDO($pdo);
        foreach ($caldav->getCalendarsForUser($principalUri) as $cal) {
            if (isset($cal['id']) && is_array($cal['id'])) {
                $caldav->deleteCalendar($cal['id']);
            }
        }
        $carddav = new CardPDO($pdo);
        foreach ($carddav->getAddressBooksForUser($principalUri) as $book) {
            if (isset($book['id'])) {
                $carddav->deleteAddressBook((int) $book['id']);
            }
        }

        $pdo->prepare('DELETE FROM groupmembers WHERE member_id = ? OR principal_id = ?')->execute([$principalId, $principalId]);

        $like = $principalUri.'/%';
        $pdo->prepare('DELETE FROM principals WHERE uri = ? OR uri LIKE ?')->execute([$principalUri, $like]);
        $pdo->prepare('DELETE FROM users WHERE username = ?')->execute([$username]);
    }
}
