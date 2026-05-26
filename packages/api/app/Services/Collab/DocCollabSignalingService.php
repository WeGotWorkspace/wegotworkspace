<?php

declare(strict_types=1);

namespace App\Services\Collab;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * HTTP signaling for docs WebRTC mesh (parity with laatste-test/signal.php).
 */
final class DocCollabSignalingService
{
    private const T_PEERS = 'collab_peers';

    private const T_MESSAGES = 'collab_messages';

    private const PEER_TIMEOUT_SECONDS = 30;

    private const MAX_MESSAGES_PER_ROOM = 1000;

    private const MAX_PEERS_PER_ROOM = 20;

    public function __construct(
        private CollabActorResolver $actors,
        private CollabRoomPolicy $rooms,
    ) {}

    /**
     * @param  array<string, mixed>  $body
     * @return array{peerId: string, peers: list<array{id: string, name: string}>}
     */
    public function join(Request $request, array $body): array
    {
        $this->pruneOldRows();

        $ownerMarker = $this->actors->ownerMarker($this->actors->requireUsername($request));
        $room = $this->rooms->cleanRoom($body['room'] ?? null);
        $name = mb_substr(trim((string) ($body['name'] ?? '')), 0, 64);
        if ($name === '') {
            $this->fail('name_required');
        }

        $peerId = bin2hex(random_bytes(8));
        $now = time();
        $this->insertPeer($room, $peerId, $name, $ownerMarker, $now);

        $count = (int) DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->count();
        if ($count > self::MAX_PEERS_PER_ROOM) {
            DB::connection('wgw')->table(self::T_PEERS)
                ->where('room', $room)
                ->where('peer_id', $peerId)
                ->delete();
            $this->fail('room_full', 409);
        }

        return [
            'peerId' => $peerId,
            'peers' => $this->peerList($room, $peerId),
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{peers: list<array{id: string, name: string}>, messages: list<array{id: int, from: string, to: string, type: string, payload: mixed}>}
     */
    public function poll(Request $request, array $body): array
    {
        $this->pruneOldRows();

        $ownerMarker = $this->actors->ownerMarker($this->actors->requireUsername($request));
        $room = $this->rooms->cleanRoom($body['room'] ?? null);
        $peerId = $this->cleanPeer($body['peerId'] ?? null);
        $this->assertPeerOwnedByActor($room, $peerId, $ownerMarker);

        $now = time();
        DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->update(['seen_at' => $now]);

        $since = max(0, (int) ($body['since'] ?? 0));
        $rows = DB::connection('wgw')->table(self::T_MESSAGES)
            ->where('room', $room)
            ->where('to_peer', $peerId)
            ->where('id', '>', $since)
            ->orderBy('id')
            ->get(['id', 'from_peer as from', 'to_peer as to', 'type', 'payload']);

        $messages = [];
        foreach ($rows as $row) {
            $decoded = json_decode((string) $row->payload, true);
            $messages[] = [
                'id' => (int) $row->id,
                'from' => (string) $row->from,
                'to' => (string) $row->to,
                'type' => (string) $row->type,
                'payload' => $decoded,
            ];
        }

        return [
            'peers' => $this->peerList($room, $peerId),
            'messages' => $messages,
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true}
     */
    public function send(Request $request, array $body): array
    {
        $this->pruneOldRows();

        $ownerMarker = $this->actors->ownerMarker($this->actors->requireUsername($request));
        $room = $this->rooms->cleanRoom($body['room'] ?? null);
        $from = $this->cleanPeer($body['peerId'] ?? null);
        $to = $this->cleanPeer($body['to'] ?? null);
        $this->assertPeerOwnedByActor($room, $from, $ownerMarker);

        $type = (string) ($body['type'] ?? '');
        if (! in_array($type, ['offer', 'answer', 'ice'], true)) {
            $this->fail('bad_type');
        }

        $fromLive = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $from)
            ->exists();
        $toLive = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $to)
            ->exists();
        if (! $fromLive || ! $toLive) {
            $this->fail('invalid_peer');
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

        $this->trimMessages($room);

        DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $from)
            ->update(['seen_at' => time()]);

        return ['ok' => true];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true}
     */
    public function leave(Request $request, array $body): array
    {
        $this->pruneOldRows();

        $ownerMarker = $this->actors->ownerMarker($this->actors->requireUsername($request));
        $room = $this->rooms->cleanRoom($body['room'] ?? null);
        $peerId = $this->cleanPeer($body['peerId'] ?? null);
        $this->assertPeerOwnedByActor($room, $peerId, $ownerMarker);

        DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->delete();

        DB::connection('wgw')->table(self::T_MESSAGES)
            ->where('room', $room)
            ->where(function ($query) use ($peerId): void {
                $query->where('from_peer', $peerId)->orWhere('to_peer', $peerId);
            })
            ->delete();

        return ['ok' => true];
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    private function peerList(string $room, string $selfId): array
    {
        return DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', '!=', $selfId)
            ->get(['peer_id as id', 'name'])
            ->map(static fn ($row) => ['id' => (string) $row->id, 'name' => (string) $row->name])
            ->values()
            ->all();
    }

    private function insertPeer(string $room, string $peerId, string $name, string $ownerMarker, int $now): void
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
        $cutoff = time() - self::PEER_TIMEOUT_SECONDS;
        $stalePeerIds = DB::connection('wgw')->table(self::T_PEERS)
            ->where('seen_at', '<', $cutoff)
            ->pluck('peer_id')
            ->all();

        if ($stalePeerIds !== []) {
            DB::connection('wgw')->table(self::T_PEERS)->whereIn('peer_id', $stalePeerIds)->delete();
            DB::connection('wgw')->table(self::T_MESSAGES)
                ->where(function ($query) use ($stalePeerIds): void {
                    $query->whereIn('from_peer', $stalePeerIds)->orWhereIn('to_peer', $stalePeerIds);
                })
                ->delete();
        }

        $messageCutoff = time() - 600;
        DB::connection('wgw')->table(self::T_MESSAGES)->where('created_at', '<', $messageCutoff)->delete();
    }

    private function trimMessages(string $room): void
    {
        $count = (int) DB::connection('wgw')->table(self::T_MESSAGES)->where('room', $room)->count();
        if ($count <= self::MAX_MESSAGES_PER_ROOM) {
            return;
        }

        $keepFromId = DB::connection('wgw')->table(self::T_MESSAGES)
            ->where('room', $room)
            ->orderByDesc('id')
            ->offset(self::MAX_MESSAGES_PER_ROOM - 1)
            ->value('id');

        if ($keepFromId !== null) {
            DB::connection('wgw')->table(self::T_MESSAGES)
                ->where('room', $room)
                ->where('id', '<', $keepFromId)
                ->delete();
        }
    }

    private function assertPeerOwnedByActor(string $room, string $peerId, string $ownerMarker): void
    {
        $row = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->first(['owner_user']);

        if ($row === null) {
            $this->fail('unknown_peer', 404, 'Unknown peer — refresh and join again');
        }

        $owner = is_string($row->owner_user ?? null) ? $row->owner_user : '';
        if ($owner === '' || ! hash_equals($owner, $ownerMarker)) {
            $this->fail('forbidden', 403);
        }
    }

    private function cleanPeer(mixed $peer): string
    {
        if (! is_string($peer) || ! preg_match('/^[a-f0-9]{16}$/', $peer)) {
            $this->fail('invalid_peer');
        }

        return $peer;
    }

    private function fail(string $error, int $status = 400, ?string $message = null): never
    {
        $payload = ['error' => $error];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        throw new CollabResponseException($status, $payload);
    }
}
