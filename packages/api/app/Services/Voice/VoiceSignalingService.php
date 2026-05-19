<?php

declare(strict_types=1);

namespace App\Services\Voice;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class VoiceSignalingService
{
    private const T_PEERS = 'voice_peers';

    private const T_MESSAGES = 'voice_messages';

    private const KNOCK_NAME_PREFIX = '__wgw_knock__:';

    public function __construct(private VoiceActorResolver $actors)
    {
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{active: bool}
     */
    public function roomStatus(array $body): array
    {
        $this->pruneOldRows();
        $room = $this->cleanRoom($body['room'] ?? null);

        return ['active' => $this->roomHasJoinablePeer($room)];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{peers: list<array{id: string, name: string}>, sessionKey: string|null}
     */
    public function join(Request $request, array $body): array
    {
        $this->ensureOwnerColumn();
        $this->pruneOldRows();

        $username = $this->actors->tryAuthenticatedUsername($request);
        $room = $this->cleanRoom($body['room'] ?? null);
        $peerId = $this->cleanPeer($body['peerId'] ?? null);
        $name = mb_substr((string) ($body['name'] ?? ''), 0, 64);
        $isKnockRequest = str_starts_with($name, self::KNOCK_NAME_PREFIX);
        $guestSessionKey = null;
        $ownerMarker = $this->actors->ownerMarkerForAuthenticatedUser($username);
        if ($ownerMarker === null) {
            if ($isKnockRequest && ! $this->roomHasJoinablePeer($room)) {
                $this->fail('room_not_active', 404);
            }
            $guestSessionKey = $this->actors->newGuestSessionKey();
            $ownerMarker = $this->actors->ownerMarkerForGuestSession($guestSessionKey);
        }

        $this->upsertPeer($room, $peerId, $name, $ownerMarker, time());

        $count = (int) DB::connection('wgw')
            ->table(self::T_PEERS)
            ->where('room', $room)
            ->count();
        if ($count > 4) {
            DB::connection('wgw')->table(self::T_PEERS)
                ->where('room', $room)
                ->where('peer_id', $peerId)
                ->delete();
            $this->fail('room_full', 409);
        }

        $peers = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', '!=', $peerId)
            ->get(['peer_id as id', 'name'])
            ->map(static fn ($row) => ['id' => (string) $row->id, 'name' => (string) $row->name])
            ->values()
            ->all();

        return [
            'peers' => $peers,
            'sessionKey' => $guestSessionKey,
        ];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{peers: list<array{id: string, name: string}>, messages: list<array<string, mixed>>}
     */
    public function poll(Request $request, array $body): array
    {
        $this->ensureOwnerColumn();
        $this->pruneOldRows();

        $ownerMarker = $this->actors->requireActorMarker($request, $body);
        $room = $this->cleanRoom($body['room'] ?? null);
        $peerId = $this->cleanPeer($body['peerId'] ?? null);
        $this->assertPeerOwnedByActor($room, $peerId, $ownerMarker);

        DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->update(['seen_at' => time()]);

        $rows = DB::connection('wgw')->table(self::T_MESSAGES)
            ->where('room', $room)
            ->where('to_peer', $peerId)
            ->orderBy('id')
            ->get(['id', 'from_peer as from', 'type', 'payload']);

        $messages = [];
        if ($rows->isNotEmpty()) {
            $ids = $rows->pluck('id')->all();
            DB::connection('wgw')->table(self::T_MESSAGES)->whereIn('id', $ids)->delete();
            foreach ($rows as $row) {
                $decoded = json_decode((string) $row->payload, true);
                $messages[] = [
                    'from' => (string) $row->from,
                    'type' => (string) $row->type,
                    'payload' => $decoded,
                ];
            }
        }

        $peers = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', '!=', $peerId)
            ->get(['peer_id as id', 'name'])
            ->map(static fn ($row) => ['id' => (string) $row->id, 'name' => (string) $row->name])
            ->values()
            ->all();

        return [
            'peers' => $peers,
            'messages' => $messages,
        ];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{ok: true}
     */
    public function send(Request $request, array $body): array
    {
        $this->ensureOwnerColumn();
        $this->pruneOldRows();

        $ownerMarker = $this->actors->requireActorMarker($request, $body);
        $room = $this->cleanRoom($body['room'] ?? null);
        $from = $this->cleanPeer($body['from'] ?? null);
        $to = $this->cleanPeer($body['to'] ?? null);
        $this->assertPeerOwnedByActor($room, $from, $ownerMarker);

        $type = (string) ($body['type'] ?? '');
        if (! in_array($type, ['offer', 'answer', 'ice', 'bye'], true)) {
            $this->fail('bad_type');
        }

        $payload = json_encode($body['payload'] ?? null);
        if ($payload === false || strlen($payload) > 200_000) {
            $this->fail('payload_too_large', 413);
        }

        DB::connection('wgw')->table(self::T_MESSAGES)->insert([
            'room' => $room,
            'from_peer' => $from,
            'to_peer' => $to,
            'type' => $type,
            'payload' => $payload,
            'created_at' => time(),
        ]);

        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{ok: true}
     */
    public function leave(Request $request, array $body): array
    {
        $this->ensureOwnerColumn();
        $this->pruneOldRows();

        $ownerMarker = $this->actors->requireActorMarker($request, $body);
        $room = $this->cleanRoom($body['room'] ?? null);
        $peerId = $this->cleanPeer($body['peerId'] ?? null);
        $this->assertPeerOwnedByActor($room, $peerId, $ownerMarker);

        DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->delete();

        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{ok: true, delivered: int}
     */
    public function chat(Request $request, array $body): array
    {
        $this->ensureOwnerColumn();
        $this->pruneOldRows();

        $ownerMarker = $this->actors->requireActorMarker($request, $body);
        $room = $this->cleanRoom($body['room'] ?? null);
        $from = $this->cleanPeer($body['from'] ?? null);
        $this->assertPeerOwnedByActor($room, $from, $ownerMarker);

        $text = trim((string) ($body['text'] ?? ''));
        $text = mb_substr($text, 0, 2000);
        if ($text === '') {
            $this->fail('empty_text');
        }

        $live = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $from)
            ->exists();
        if (! $live) {
            $this->fail('not_in_room');
        }

        $payload = json_encode(['text' => $text], JSON_THROW_ON_ERROR);
        if (strlen($payload) > 12_000) {
            $this->fail('payload_too_large', 413);
        }

        $targets = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', '!=', $from)
            ->pluck('peer_id')
            ->all();

        if ($targets === []) {
            return ['ok' => true, 'delivered' => 0];
        }

        $now = time();
        $rows = [];
        foreach ($targets as $target) {
            $rows[] = [
                'room' => $room,
                'from_peer' => $from,
                'to_peer' => (string) $target,
                'type' => 'chat',
                'payload' => $payload,
                'created_at' => $now,
            ];
        }
        DB::connection('wgw')->table(self::T_MESSAGES)->insert($rows);

        return ['ok' => true, 'delivered' => count($targets)];
    }

    private function upsertPeer(string $room, string $peerId, string $name, string $ownerMarker, int $now): void
    {
        $driver = DB::connection('wgw')->getDriverName();
        if ($driver === 'mysql') {
            DB::connection('wgw')->statement(
                'INSERT INTO '.self::T_PEERS.' (room, peer_id, name, owner_user, seen_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), owner_user = VALUES(owner_user), seen_at = VALUES(seen_at)',
                [$room, $peerId, $name, $ownerMarker, $now]
            );

            return;
        }

        DB::connection('wgw')->statement(
            'INSERT INTO '.self::T_PEERS.' (room, peer_id, name, owner_user, seen_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(room, peer_id) DO UPDATE SET name = excluded.name, owner_user = excluded.owner_user, seen_at = excluded.seen_at',
            [$room, $peerId, $name, $ownerMarker, $now]
        );
    }

    private function pruneOldRows(): void
    {
        $cutoff = time() - 600;
        DB::connection('wgw')->table(self::T_PEERS)->where('seen_at', '<', $cutoff)->delete();
        DB::connection('wgw')->table(self::T_MESSAGES)->where('created_at', '<', $cutoff)->delete();
    }

    private function ensureOwnerColumn(): void
    {
        if (DB::connection('wgw')->getSchemaBuilder()->hasColumn(self::T_PEERS, 'owner_user')) {
            return;
        }

        $driver = DB::connection('wgw')->getDriverName();
        if ($driver === 'mysql') {
            DB::connection('wgw')->statement(
                'ALTER TABLE '.self::T_PEERS."
                 ADD COLUMN owner_user VARCHAR(190) NOT NULL DEFAULT '' AFTER name"
            );
        } else {
            DB::connection('wgw')->statement(
                "ALTER TABLE ".self::T_PEERS." ADD COLUMN owner_user TEXT NOT NULL DEFAULT ''"
            );
        }
    }

    private function assertPeerOwnedByActor(string $room, string $peerId, string $ownerMarker): void
    {
        $owner = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->value('owner_user');
        if (! is_string($owner) || $owner === '' || ! hash_equals($owner, $ownerMarker)) {
            $this->fail('forbidden', 403);
        }
    }

    private function roomHasJoinablePeer(string $room): bool
    {
        $rows = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->limit(32)
            ->get(['owner_user', 'name']);

        foreach ($rows as $row) {
            $owner = is_string($row->owner_user ?? null) ? $row->owner_user : '';
            if (str_starts_with($owner, 'u:')) {
                return true;
            }
            $name = is_string($row->name ?? null) ? trim($row->name) : '';
            if ($name !== '' && ! str_starts_with($name, self::KNOCK_NAME_PREFIX)) {
                return true;
            }
        }

        return false;
    }

    private function cleanRoom(mixed $room): string
    {
        if (! is_string($room) || ! preg_match('/^[A-Za-z0-9_-]{4,64}$/', $room)) {
            $this->fail('invalid_room');
        }

        return $room;
    }

    private function cleanPeer(mixed $peer): string
    {
        if (! is_string($peer) || ! preg_match('/^[A-Za-z0-9_-]{4,64}$/', $peer)) {
            $this->fail('invalid_peer');
        }

        return $peer;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function fail(string $error, int $status = 400, ?string $message = null): never
    {
        $payload = ['error' => $error];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        throw new VoiceResponseException($status, $payload);
    }
}
