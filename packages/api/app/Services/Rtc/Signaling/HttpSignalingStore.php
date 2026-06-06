<?php

declare(strict_types=1);

namespace App\Services\Rtc\Signaling;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class HttpSignalingStore
{
    public function __construct(
        private readonly RtcSignalingPolicy $policy,
    ) {}

    public function policy(): RtcSignalingPolicy
    {
        return $this->policy;
    }

    public function pruneOldRows(): void
    {
        $cutoff = time() - $this->policy->peerTimeoutSeconds;
        $stalePeerIds = $this->peerQuery()
            ->where('seen_at', '<', $cutoff)
            ->pluck('peer_id')
            ->all();

        if ($stalePeerIds !== []) {
            $this->peerQuery()->whereIn('peer_id', $stalePeerIds)->delete();
            $this->messageQuery()
                ->where(function ($query) use ($stalePeerIds): void {
                    $query->whereIn('from_peer', $stalePeerIds)->orWhereIn('to_peer', $stalePeerIds);
                })
                ->delete();
        }

        $messageCutoff = time() - $this->policy->messageRetentionSeconds;
        $this->messageQuery()
            ->where('created_at', '<', $messageCutoff)
            ->delete();
    }

    public function upsertPeer(string $room, string $peerId, string $name, string $ownerMarker, int $now): void
    {
        $this->policy->peerModelClass::upsert(
            [[
                'room' => $room,
                'peer_id' => $peerId,
                'name' => $name,
                'owner_user' => $ownerMarker,
                'seen_at' => $now,
            ]],
            ['room', 'peer_id'],
            ['name', 'owner_user', 'seen_at'],
        );
    }

    public function countPeers(string $room): int
    {
        return $this->peerQuery()
            ->where('room', $room)
            ->count();
    }

    public function deletePeer(string $room, string $peerId): void
    {
        $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->delete();
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    public function peerList(string $room, string $selfId): array
    {
        return $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', '!=', $selfId)
            ->get(['peer_id as id', 'name'])
            ->map(static fn ($row) => ['id' => (string) $row->id, 'name' => (string) $row->name])
            ->values()
            ->all();
    }

    public function touchPeer(string $room, string $peerId, ?int $now = null): void
    {
        $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->update(['seen_at' => $now ?? time()]);
    }

    public function assertPeerOwnedByActor(string $room, string $peerId, string $ownerMarker): void
    {
        $row = $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->first(['owner_user']);

        if ($row === null) {
            if ($this->policy->unknownPeerWhenMissing) {
                $this->fail('unknown_peer', 404, 'Unknown peer — refresh and join again');
            }
            $this->fail('forbidden', 403);
        }

        $owner = is_string($row->owner_user ?? null) ? $row->owner_user : '';
        if ($owner === '' || ! hash_equals($owner, $ownerMarker)) {
            $this->fail('forbidden', 403);
        }
    }

    public function peerExists(string $room, string $peerId): bool
    {
        return $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->exists();
    }

    /**
     * @return array{peers: list<array{id: string, name: string}>, messages: list<array<string, mixed>>}
     */
    public function poll(string $room, string $peerId, int $since = 0): array
    {
        $this->touchPeer($room, $peerId);

        if ($this->policy->pollMode === RtcSignalingPollMode::SinceCursor) {
            $query = $this->messageQuery()
                ->where('room', $room)
                ->where('to_peer', $peerId)
                ->where('id', '>', max(0, $since))
                ->orderBy('id');

            $messages = [];
            foreach ($query->get(['id', 'from_peer as from', 'to_peer as to', 'type', 'payload']) as $row) {
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

        $rows = $this->messageQuery()
            ->where('room', $room)
            ->where('to_peer', $peerId)
            ->orderBy('id')
            ->get(['id', 'from_peer as from', 'type', 'payload']);

        $messages = [];
        if ($rows->isNotEmpty()) {
            $ids = $rows->pluck('id')->all();
            $this->messageQuery()->whereIn('id', $ids)->delete();
            foreach ($rows as $row) {
                $decoded = json_decode((string) $row->payload, true);
                $messages[] = [
                    'from' => (string) $row->from,
                    'type' => (string) $row->type,
                    'payload' => $decoded,
                ];
            }
        }

        return [
            'peers' => $this->peerList($room, $peerId),
            'messages' => $messages,
        ];
    }

    public function send(string $room, string $from, string $to, string $type, mixed $payload): void
    {
        if (! in_array($type, $this->policy->allowedSendTypes, true)) {
            $this->fail('bad_type');
        }

        if ($this->policy->requireLivePeersOnSend) {
            if (! $this->peerExists($room, $from) || ! $this->peerExists($room, $to)) {
                $this->fail('invalid_peer');
            }
        }

        $encoded = json_encode($payload);
        if ($encoded === false || strlen($encoded) > 200_000) {
            $this->fail('payload_too_large', 413);
        }

        $this->policy->messageModelClass::query()->create([
            'room' => $room,
            'from_peer' => $from,
            'to_peer' => $to,
            'type' => $type,
            'payload' => $encoded,
            'created_at' => time(),
        ]);

        if ($this->policy->trimMessagesOnSend) {
            $this->trimMessages($room);
        }

        $this->touchPeer($room, $from);
    }

    public function leave(string $room, string $peerId): void
    {
        $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', $peerId)
            ->delete();

        if ($this->policy->leaveDeletesPeerMessages) {
            $this->messageQuery()
                ->where('room', $room)
                ->where(function ($query) use ($peerId): void {
                    $query->where('from_peer', $peerId)->orWhere('to_peer', $peerId);
                })
                ->delete();
        }
    }

    public function cleanPeer(mixed $peer): string
    {
        if (! is_string($peer) || preg_match($this->policy->peerIdPattern, $peer) !== 1) {
            $this->fail('invalid_peer');
        }

        return $peer;
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public function readSendFrom(array $body): string
    {
        $field = $this->policy->sendFromField;

        return $this->cleanPeer($body[$field] ?? null);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    public function insertMessages(array $rows): void
    {
        if ($rows === []) {
            return;
        }

        $this->policy->messageModelClass::query()->insert($rows);
    }

    /**
     * @return list<string>
     */
    public function peerIdsInRoomExcept(string $room, string $exceptPeerId): array
    {
        return $this->peerQuery()
            ->where('room', $room)
            ->where('peer_id', '!=', $exceptPeerId)
            ->pluck('peer_id')
            ->map(static fn ($id) => (string) $id)
            ->all();
    }

    /**
     * @return list<object{owner_user: mixed, name: mixed}>
     */
    public function peersInRoom(string $room, int $limit = 32): array
    {
        return $this->peerQuery()
            ->where('room', $room)
            ->limit($limit)
            ->get(['owner_user', 'name'])
            ->all();
    }

    private function trimMessages(string $room): void
    {
        $max = $this->policy->maxMessagesPerRoom;
        if ($max === null) {
            return;
        }

        $count = $this->messageQuery()->where('room', $room)->count();
        if ($count <= $max) {
            return;
        }

        $keepFromId = $this->messageQuery()
            ->where('room', $room)
            ->orderByDesc('id')
            ->offset($max - 1)
            ->value('id');

        if ($keepFromId !== null) {
            $this->messageQuery()
                ->where('room', $room)
                ->where('id', '<', $keepFromId)
                ->delete();
        }
    }

    /** @return Builder<Model> */
    private function peerQuery(): Builder
    {
        return $this->policy->peerModelClass::query();
    }

    /** @return Builder<Model> */
    private function messageQuery(): Builder
    {
        return $this->policy->messageModelClass::query();
    }

    private function fail(string $error, int $status = 400, ?string $message = null): never
    {
        $payload = ['error' => $error];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        throw new RtcSignalingException($status, $payload);
    }
}
