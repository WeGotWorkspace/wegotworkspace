<?php

declare(strict_types=1);

namespace App\Filegator;

use App\Admin\AdminPolicy;
use App\SabreUiAuthGate;
use App\Admin\AuthService;
use Filegator\Services\Auth\AuthInterface;
use Filegator\Services\Auth\User;
use Filegator\Services\Auth\UsersCollection;
use Filegator\Services\Service;
use Sabre\HTTP\Auth\Basic;
use Sabre\HTTP\Response;
use Sabre\HTTP\Sapi;

/**
 * Uses the same HTTP Basic realm and PDO user store as SabreDAV (see {@see \App\Office\OfficeDavAuth}).
 */
final class SabreDavBasicAuth implements AuthInterface, Service
{
    private \PDO $pdo;

    private string $realm = 'SabreDAV';

    /** @var list<string> */
    private const FILE_PERMISSIONS = ['read', 'write', 'upload', 'download', 'batchdownload', 'zip', 'chmod'];

    public function init(array $config = []): void
    {
        $pdo = $config['pdo'] ?? null;
        if (is_callable($pdo)) {
            $pdo = $pdo();
        }
        if (!$pdo instanceof \PDO) {
            throw new \RuntimeException('SabreDavBasicAuth requires a PDO instance or callable returning PDO in config.');
        }
        $this->pdo = $pdo;

        $realm = $config['realm'] ?? 'SabreDAV';
        if (is_callable($realm)) {
            $realm = $realm();
        }
        $this->realm = (string) $realm;
    }

    public function user(): ?User
    {
        $fromGate = SabreUiAuthGate::validatedUsername($this->realm);
        if ($fromGate !== null) {
            return $this->buildUser($fromGate);
        }

        $request = Sapi::getRequest();
        $basic = new Basic($this->realm, $request, new Response());
        $creds = $basic->getCredentials();
        if ($creds === null) {
            return null;
        }

        $username = strtolower(trim((string) $creds[0]));
        $password = (string) $creds[1];
        if ($username === '' || !AuthService::validateWithPdo($this->pdo, $username, $password, $this->realm)) {
            return null;
        }

        return $this->buildUser($username);
    }

    public function authenticate($username, $password): bool
    {
        $username = strtolower(trim((string) $username));

        return $username !== '' && AuthService::validateWithPdo($this->pdo, $username, (string) $password, $this->realm);
    }

    public function forget()
    {
        return true;
    }

    public function find($username): ?User
    {
        return null;
    }

    public function store(User $user)
    {
        return true;
    }

    public function update($username, User $user, $password = ''): User
    {
        throw new \RuntimeException('Change passwords in SabreDAV admin, not in FileGator.');
    }

    public function add(User $user, $password): User
    {
        throw new \RuntimeException('Create users in SabreDAV admin, not in FileGator.');
    }

    public function delete(User $user)
    {
        throw new \RuntimeException('Delete users in SabreDAV admin, not in FileGator.');
    }

    public function getGuest(): User
    {
        $g = new User();
        $g->setUsername('guest');
        $g->setName('Guest');
        $g->setRole('guest');
        $g->setHomedir('/');
        $g->setPermissions([], true);

        return $g;
    }

    public function allUsers(): UsersCollection
    {
        return new UsersCollection();
    }

    private function buildUser(string $username): User
    {
        $isAdmin = AdminPolicy::isAdmin($this->pdo, $username);
        $role = $isAdmin ? 'admin' : 'user';
        $name = $this->displayName($username);

        $u = new User();
        $u->setUsername($username);
        $u->setName($name);
        $u->setRole($role);
        // Expose the same top-level tree as WebDAV /files.
        $u->setHomedir('/');
        $u->setPermissions(self::FILE_PERMISSIONS, false);

        return $u;
    }

    private function displayName(string $username): string
    {
        $stmt = $this->pdo->prepare('SELECT displayname FROM principals WHERE uri = ? LIMIT 1');
        $stmt->execute(['principals/'.$username]);
        $v = $stmt->fetchColumn();

        return is_string($v) && trim($v) !== '' ? trim($v) : $username;
    }
}
