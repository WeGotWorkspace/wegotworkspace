<?php

declare(strict_types=1);

namespace App\Services\Collab;

use Illuminate\Support\Facades\DB;

/**
 * Step 2.1 bridge endpoint:
 * Laravel-hosted signaling with the same action protocol as the legacy
 * parity signal endpoint.
 *
 * Intentionally keeps anonymous peer behavior for parity auditing.
 *
 * @phpstan-type LegacyPeer array{id: string, name: string}
 * @phpstan-type LegacyMessage array{id: int, from: string, to: string, type: string, payload: mixed}
 */
final class LegacySignalParityService
{
    private const T_PEERS = 'collab_peers';

    private const T_MESSAGES = 'collab_messages';

    private const PEER_TIMEOUT_SECONDS = 30;

    private const MAX_MESSAGES_PER_ROOM = 1000;

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function handle(array $body): array
    {
        $this->pruneOldRows();
        $action = (string) ($body['action'] ?? '');
        $room = $this->cleanRoom($body['room'] ?? 'docs/test-together.md');

        return match ($action) {
            'join' => $this->join($room, $body),
            'poll' => $this->poll($room, $body),
            'signal' => $this->signal($room, $body),
            'leave' => $this->leave($room, $body),
            default => [
                'error' => 'unknown action',
                'actions' => ['join', 'poll', 'signal', 'leave'],
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{peerId: string, peers: list<LegacyPeer>}
     */
    private function join(string $room, array $body): array
    {
        $name = mb_substr(trim((string) ($body['name'] ?? '')), 0, 64);
        if ($name === '') {
            throw new CollabResponseException(400, ['error' => 'name required']);
        }

        $peerId = bin2hex(random_bytes(8));
        $now = time();

        $driver = DB::connection('wgw')->getDriverName();
        if ($driver === 'mysql') {
            DB::connection('wgw')->statement(
                'INSERT INTO '.self::T_PEERS.' (room, peer_id, name, owner_user, seen_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), owner_user = VALUES(owner_user), seen_at = VALUES(seen_at)',
                [$room, $peerId, $name, 'legacy', $now]
            );
        } else {
            DB::connection('wgw')->statement(
                'INSERT INTO '.self::T_PEERS.' (room, peer_id, name, owner_user, seen_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(room, peer_id) DO UPDATE SET name = excluded.name, owner_user = excluded.owner_user, seen_at = excluded.seen_at',
                [$room, $peerId, $name, 'legacy', $now]
            );
        }

        return [
            'peerId' => $peerId,
            'peers' => $this->peerList($room, $peerId),
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{peers: list<LegacyPeer>, messages: list<LegacyMessage>}
     */
    private function poll(string $room, array $body): array
    {
        $peerId = $this->cleanPeer($body['peerId'] ?? null);
        $exists = DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->exists();
        if (! $exists) {
            throw new CollabResponseException(404, ['error' => 'unknown peer — refresh and join again']);
        }

        DB::connection('wgw')->table(self::T_PEERS)
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->update(['seen_at' => time()]);

        $since = max(0, (int) ($body['since'] ?? 0));
        $rows = DB::connection('wgw')->table(self::T_MESSAGES)
            ->where('room', $room)
            ->where('to_peer', $peerId)
            ->where('id', '>', $since)
            ->orderBy('id')
            ->get(['id', 'from_peer as from', 'to_peer as to', 'type', 'payload']);

        $messages = [];
        foreach ($rows as $row) {
            $messages[] = [
                'id' => (int) $row->id,
                'from' => (string) $row->from,
                'to' => (string) $row->to,
                'type' => (string) $row->type,
                'payload' => json_decode((string) $row->payload, true),
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
    private function signal(string $room, array $body): array
    {
        $from = $this->cleanPeer($body['peerId'] ?? null);
        $to = $this->cleanPeer($body['to'] ?? null);
        $type = (string) ($body['type'] ?? '');

        if (! in_array($type, ['offer', 'answer', 'ice'], true)) {
            throw new CollabResponseException(400, ['error' => 'invalid signal type']);
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
            throw new CollabResponseException(400, ['error' => 'invalid peer']);
        }

        $payload = json_encode($body['payload'] ?? null);
        if ($payload === false) {
            throw new CollabResponseException(400, ['error' => 'invalid payload']);
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
    private function leave(string $room, array $body): array
    {
        $peerId = $this->cleanPeer($body['peerId'] ?? null);

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
     * @return list<LegacyPeer>
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

    private function cleanPeer(mixed $peer): string
    {
        if (! is_string($peer) || ! preg_match('/^[a-f0-9]{16}$/', $peer)) {
            throw new CollabResponseException(400, ['error' => 'invalid peer']);
        }

        return $peer;
    }

    private function cleanRoom(mixed $room): string
    {
        if (! is_string($room) || ! preg_match('/^[A-Za-z0-9._~\/-]{4,190}$/', $room)) {
            throw new CollabResponseException(400, ['error' => 'invalid_room']);
        }

        return $room;
    }
}
