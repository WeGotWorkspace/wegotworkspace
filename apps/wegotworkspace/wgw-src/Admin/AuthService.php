<?php

declare(strict_types=1);

namespace App\Admin;

use App\Config;
use Sabre\DAV\Auth\Backend\PDOBasicAuth;

final class AuthService
{
    public static function validate(string $username, string $password): bool
    {
        $cfg = Config::load();
        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );

        return self::validateWithPdo(
            $pdo,
            $username,
            $password,
            (string) ($cfg['auth_realm'] ?? 'SabreDAV')
        );
    }

    public static function validateWithPdo(\PDO $pdo, string $username, string $password, string $realm): bool
    {
        $auth = new PDOBasicAuth($pdo, ['digestColumn' => 'digest']);
        $auth->setRealm($realm);

        return $auth->validateUserPass($username, $password);
    }
}
