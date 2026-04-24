<?php

declare(strict_types=1);

namespace App\Mail;

/**
 * Webmail “From” identity comes from the CalDAV/CardDAV principal row (edited in admin).
 */
final class MailPrincipalIdentity
{
    /**
     * @return array{displayName: string, emailAddress: string}
     */
    public static function fetch(\PDO $pdo, string $username): array
    {
        $stmt = $pdo->prepare('SELECT email, displayname FROM principals WHERE uri = ? LIMIT 1');
        $stmt->execute(['principals/'.$username]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return ['displayName' => $username, 'emailAddress' => ''];
        }
        $email = isset($row['email']) && is_string($row['email']) ? trim($row['email']) : '';
        $dn = isset($row['displayname']) && is_string($row['displayname']) ? trim($row['displayname']) : '';

        return [
            'displayName' => $dn !== '' ? $dn : $username,
            'emailAddress' => $email,
        ];
    }
}
