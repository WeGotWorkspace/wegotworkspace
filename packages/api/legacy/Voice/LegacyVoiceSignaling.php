<?php

declare(strict_types=1);

namespace Wgw\Legacy\Voice;

/**
 * Signaling from {@code main} {@see \App\Voice\VoiceSignaling} — PDO + voice_peers/voice_messages.
 * Callable from Laravel via {@see LegacyVoiceSignaling::dispatch()} (no echo/exit).
 */
final class LegacyVoiceSignaling
{
    private const T_PEERS = 'voice_peers';

    private const T_MESSAGES = 'voice_messages';

    private const KNOCK_NAME_PREFIX = '__wgw_knock__:';

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return array<string, mixed>
     */
    public static function dispatch(
        \PDO $pdo,
        string $realm,
        string $action,
        array $body,
        callable $tryAuthenticatedUsername,
    ): array {
        self::ensureOwnerColumn($pdo);
        self::pruneOldRows($pdo);
        $db = $pdo;

        return match ($action) {
            'room' => [
                'active' => self::roomHasJoinablePeer($db, self::cleanRoom($body['room'] ?? null)),
            ],
            'join' => self::join($db, $body, $tryAuthenticatedUsername),
            'poll' => self::poll($db, $body, $tryAuthenticatedUsername),
            'send' => self::send($db, $body, $tryAuthenticatedUsername),
            'leave' => self::leave($db, $body, $tryAuthenticatedUsername),
            'chat' => self::chat($db, $body, $tryAuthenticatedUsername),
            default => self::fail('unknown_action'),
        };
    }

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return array{peers: list<array{id: string, name: string}>, sessionKey: string|null}
     */
    private static function join(\PDO $db, array $body, callable $tryAuthenticatedUsername): array
    {
        $username = $tryAuthenticatedUsername();
        $room = self::cleanRoom($body['room'] ?? null);
        $peerId = self::cleanPeer($body['peerId'] ?? null);
        $name = mb_substr((string) ($body['name'] ?? ''), 0, 64);
        $isKnockRequest = str_starts_with($name, self::KNOCK_NAME_PREFIX);
        $guestSessionKey = null;
        $ownerMarker = self::ownerMarkerForAuthenticatedUser($username);
        if ($ownerMarker === null) {
            if ($isKnockRequest && ! self::roomHasJoinablePeer($db, $room)) {
                self::fail('room_not_active', 404);
            }
            $guestSessionKey = self::readGuestSessionKey($body) ?? self::newGuestSessionKey();
            $ownerMarker = self::ownerMarkerForGuestSession($guestSessionKey);
        }

        self::upsertPeer($db, $room, $peerId, $name, $ownerMarker, time());

        $cnt = $db->prepare('SELECT COUNT(*) FROM '.self::T_PEERS.' WHERE room = :r');
        $cnt->execute([':r' => $room]);
        $count = (int) $cnt->fetchColumn();
        if ($count > 4) {
            $db->prepare('DELETE FROM '.self::T_PEERS.' WHERE room=:r AND peer_id=:p')
                ->execute([':r' => $room, ':p' => $peerId]);
            self::fail('room_full', 409);
        }

        $peers = $db->prepare('SELECT peer_id AS id, name FROM '.self::T_PEERS.' WHERE room=:r AND peer_id != :p');
        $peers->execute([':r' => $room, ':p' => $peerId]);

        return [
            'peers' => $peers->fetchAll(\PDO::FETCH_ASSOC),
            'sessionKey' => $guestSessionKey,
        ];
    }

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return array{peers: list<array{id: string, name: string}>, messages: list<array<string, mixed>>}
     */
    private static function poll(\PDO $db, array $body, callable $tryAuthenticatedUsername): array
    {
        $ownerMarker = self::requireActorMarker($body, $tryAuthenticatedUsername);
        $room = self::cleanRoom($body['room'] ?? null);
        $peerId = self::cleanPeer($body['peerId'] ?? null);
        self::assertPeerOwnedByActor($db, $room, $peerId, $ownerMarker);

        $db->prepare('UPDATE '.self::T_PEERS.' SET seen_at=:t WHERE room=:r AND peer_id=:p')
            ->execute([':t' => time(), ':r' => $room, ':p' => $peerId]);

        $sel = $db->prepare(
            'SELECT id, from_peer AS "from", type, payload
             FROM '.self::T_MESSAGES.' WHERE room=:r AND to_peer=:p ORDER BY id ASC'
        );
        $sel->execute([':r' => $room, ':p' => $peerId]);
        $rows = $sel->fetchAll(\PDO::FETCH_ASSOC);

        if ($rows) {
            $ids = array_column($rows, 'id');
            $in = implode(',', array_fill(0, count($ids), '?'));
            $del = $db->prepare('DELETE FROM '.self::T_MESSAGES." WHERE id IN ($in)");
            $del->execute($ids);
            foreach ($rows as &$r) {
                $r['payload'] = json_decode((string) $r['payload'], true);
                unset($r['id']);
            }
            unset($r);
        }

        $peers = $db->prepare('SELECT peer_id AS id, name FROM '.self::T_PEERS.' WHERE room=:r AND peer_id != :p');
        $peers->execute([':r' => $room, ':p' => $peerId]);

        return [
            'peers' => $peers->fetchAll(\PDO::FETCH_ASSOC),
            'messages' => $rows,
        ];
    }

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return array{ok: true}
     */
    private static function send(\PDO $db, array $body, callable $tryAuthenticatedUsername): array
    {
        $ownerMarker = self::requireActorMarker($body, $tryAuthenticatedUsername);
        $room = self::cleanRoom($body['room'] ?? null);
        $from = self::cleanPeer($body['from'] ?? null);
        $to = self::cleanPeer($body['to'] ?? null);
        self::assertPeerOwnedByActor($db, $room, $from, $ownerMarker);
        $type = (string) ($body['type'] ?? '');
        if (! in_array($type, ['offer', 'answer', 'ice', 'bye'], true)) {
            self::fail('bad_type');
        }

        $payload = json_encode($body['payload'] ?? null);
        if ($payload === false || strlen($payload) > 200_000) {
            self::fail('payload_too_large', 413);
        }

        $db->prepare(
            'INSERT INTO '.self::T_MESSAGES.'(room, from_peer, to_peer, type, payload, created_at)
             VALUES(:r, :f, :t, :ty, :pl, :c)'
        )->execute([
            ':r' => $room,
            ':f' => $from,
            ':t' => $to,
            ':ty' => $type,
            ':pl' => $payload,
            ':c' => time(),
        ]);

        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return array{ok: true}
     */
    private static function leave(\PDO $db, array $body, callable $tryAuthenticatedUsername): array
    {
        $ownerMarker = self::requireActorMarker($body, $tryAuthenticatedUsername);
        $room = self::cleanRoom($body['room'] ?? null);
        $peerId = self::cleanPeer($body['peerId'] ?? null);
        self::assertPeerOwnedByActor($db, $room, $peerId, $ownerMarker);
        $db->prepare('DELETE FROM '.self::T_PEERS.' WHERE room=:r AND peer_id=:p')
            ->execute([':r' => $room, ':p' => $peerId]);

        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return array{ok: true, delivered: int}
     */
    private static function chat(\PDO $db, array $body, callable $tryAuthenticatedUsername): array
    {
        $ownerMarker = self::requireActorMarker($body, $tryAuthenticatedUsername);
        $room = self::cleanRoom($body['room'] ?? null);
        $from = self::cleanPeer($body['from'] ?? null);
        self::assertPeerOwnedByActor($db, $room, $from, $ownerMarker);
        $text = trim((string) ($body['text'] ?? ''));
        $text = mb_substr($text, 0, 2000);
        if ($text === '') {
            self::fail('empty_text');
        }

        $live = $db->prepare('SELECT 1 FROM '.self::T_PEERS.' WHERE room=:r AND peer_id=:p');
        $live->execute([':r' => $room, ':p' => $from]);
        if (! $live->fetchColumn()) {
            self::fail('not_in_room');
        }

        $payload = json_encode(['text' => $text], JSON_THROW_ON_ERROR);
        if (strlen($payload) > 12_000) {
            self::fail('payload_too_large', 413);
        }

        $others = $db->prepare('SELECT peer_id FROM '.self::T_PEERS.' WHERE room=:r AND peer_id != :p');
        $others->execute([':r' => $room, ':p' => $from]);
        /** @var list<string> $targets */
        $targets = $others->fetchAll(\PDO::FETCH_COLUMN);
        if ($targets === []) {
            return ['ok' => true, 'delivered' => 0];
        }

        $ins = $db->prepare(
            'INSERT INTO '.self::T_MESSAGES.'(room, from_peer, to_peer, type, payload, created_at)
             VALUES(:r, :f, :t, :ty, :pl, :c)'
        );
        $now = time();
        foreach ($targets as $target) {
            $ins->execute([
                ':r' => $room,
                ':f' => $from,
                ':t' => (string) $target,
                ':ty' => 'chat',
                ':pl' => $payload,
                ':c' => $now,
            ]);
        }

        return ['ok' => true, 'delivered' => count($targets)];
    }

    /**
     * @param array<string, mixed> $body
     * @param callable(): ?string $tryAuthenticatedUsername
     *
     * @return non-empty-string
     */
    private static function requireActorMarker(array $body, callable $tryAuthenticatedUsername): string
    {
        $forUser = self::ownerMarkerForAuthenticatedUser($tryAuthenticatedUsername());
        if ($forUser !== null) {
            return $forUser;
        }

        $sessionKey = self::readGuestSessionKey($body);
        if ($sessionKey !== null) {
            return self::ownerMarkerForGuestSession($sessionKey);
        }

        throw new LegacyVoiceException(401, [
            'error' => 'auth_required',
            'message' => 'Sign in or re-open the guest join link to start a signaling session.',
        ]);
    }

    private static function assertPeerOwnedByActor(\PDO $db, string $room, string $peerId, string $ownerMarker): void
    {
        $stmt = $db->prepare('SELECT owner_user FROM '.self::T_PEERS.' WHERE room = :r AND peer_id = :p');
        $stmt->execute([':r' => $room, ':p' => $peerId]);
        $owner = $stmt->fetchColumn();
        if (! is_string($owner) || $owner === '' || ! hash_equals($owner, $ownerMarker)) {
            self::fail('forbidden', 403);
        }
    }

    /**
     * @return non-empty-string|null
     */
    private static function ownerMarkerForAuthenticatedUser(?string $username): ?string
    {
        if ($username === null || $username === '') {
            return null;
        }

        return 'u:'.$username;
    }

    /**
     * @return non-empty-string
     */
    private static function ownerMarkerForGuestSession(string $sessionKey): string
    {
        return 'g:'.$sessionKey;
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return non-empty-string|null
     */
    private static function readGuestSessionKey(array $body): ?string
    {
        $raw = $body['sessionKey'] ?? null;
        if (! is_string($raw)) {
            return null;
        }
        if (! preg_match('/^[a-f0-9]{32}$/', $raw)) {
            return null;
        }

        return $raw;
    }

    /**
     * @return non-empty-string
     */
    private static function newGuestSessionKey(): string
    {
        return bin2hex(random_bytes(16));
    }

    private static function cleanRoom(mixed $room): string
    {
        if (! is_string($room) || ! preg_match('/^[A-Za-z0-9_-]{4,64}$/', $room)) {
            self::fail('invalid_room');
        }

        return $room;
    }

    private static function cleanPeer(mixed $p): string
    {
        if (! is_string($p) || ! preg_match('/^[A-Za-z0-9_-]{4,64}$/', $p)) {
            self::fail('invalid_peer');
        }

        return $p;
    }

    private static function roomHasJoinablePeer(\PDO $db, string $room): bool
    {
        $stmt = $db->prepare('SELECT owner_user, name FROM '.self::T_PEERS.' WHERE room = :r LIMIT 32');
        $stmt->execute([':r' => $room]);
        /** @var list<array{owner_user?: mixed, name?: mixed}> $rows */
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $owner = is_string($row['owner_user'] ?? null) ? $row['owner_user'] : '';
            if (str_starts_with($owner, 'u:')) {
                return true;
            }
            $name = is_string($row['name'] ?? null) ? trim($row['name']) : '';
            if ($name !== '' && ! str_starts_with($name, self::KNOCK_NAME_PREFIX)) {
                return true;
            }
        }

        return false;
    }

    private static function upsertPeer(\PDO $db, string $room, string $peerId, string $name, string $ownerMarker, int $now): void
    {
        $driver = (string) $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $db->prepare(
                'INSERT INTO '.self::T_PEERS.' (room, peer_id, name, owner_user, seen_at)
                 VALUES (:r, :p, :n, :u, :t)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), owner_user = VALUES(owner_user), seen_at = VALUES(seen_at)'
            );
            $stmt->execute([':r' => $room, ':p' => $peerId, ':n' => $name, ':u' => $ownerMarker, ':t' => $now]);

            return;
        }

        $stmt = $db->prepare(
            'INSERT INTO '.self::T_PEERS.' (room, peer_id, name, owner_user, seen_at)
             VALUES (:r, :p, :n, :u, :t)
             ON CONFLICT(room, peer_id) DO UPDATE SET name = excluded.name, owner_user = excluded.owner_user, seen_at = excluded.seen_at'
        );
        $stmt->execute([':r' => $room, ':p' => $peerId, ':n' => $name, ':u' => $ownerMarker, ':t' => $now]);
    }

    private static function pruneOldRows(\PDO $db): void
    {
        $cutoff = time() - 600;
        $db->prepare('DELETE FROM '.self::T_PEERS.' WHERE seen_at < :c')->execute([':c' => $cutoff]);
        $db->prepare('DELETE FROM '.self::T_MESSAGES.' WHERE created_at < :c')->execute([':c' => $cutoff]);
    }

    private static function ensureOwnerColumn(\PDO $db): void
    {
        try {
            $db->query('SELECT owner_user FROM '.self::T_PEERS.' LIMIT 1');

            return;
        } catch (\PDOException) {
            // Runtime backfill for older installs.
        }

        $driver = (string) $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        try {
            if ($driver === 'mysql') {
                $db->exec(
                    'ALTER TABLE '.self::T_PEERS."
                     ADD COLUMN owner_user VARCHAR(190) NOT NULL DEFAULT '' AFTER name"
                );
            } else {
                $db->exec('ALTER TABLE '.self::T_PEERS." ADD COLUMN owner_user TEXT NOT NULL DEFAULT ''");
            }
        } catch (\PDOException $e) {
            $msg = strtolower($e->getMessage());
            $duplicate = str_contains($msg, 'duplicate column') || str_contains($msg, 'already exists');
            if (! $duplicate) {
                throw $e;
            }
        }
    }

    /**
     * @return never
     */
    private static function fail(string $error, int $status = 400): void
    {
        throw new LegacyVoiceException($status, ['error' => $error]);
    }
}
