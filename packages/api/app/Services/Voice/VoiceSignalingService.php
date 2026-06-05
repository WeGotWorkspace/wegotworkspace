<?php

declare(strict_types=1);

namespace App\Services\Voice;

use App\Services\Rtc\RtcSettingsService;
use App\Services\Rtc\Signaling\HttpSignalingStore;
use App\Services\Rtc\Signaling\RtcSignalingException;
use App\Services\Rtc\Signaling\RtcSignalingPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class VoiceSignalingService
{
    private const KNOCK_NAME_PREFIX = '__wgw_knock__:';

    private const MAX_PEERS_PER_ROOM = 4;

    private readonly HttpSignalingStore $store;

    public function __construct(
        private VoiceActorResolver $actors,
        private RtcSettingsService $rtcSettingsService,
    ) {
        $this->store = new HttpSignalingStore(RtcSignalingPolicy::voice());
    }

    /**
     * @return array{stunUrls: string, turnUrls: string, turnUsername: string, turnPassword: string}
     */
    public function rtcSettings(): array
    {
        return $this->rtcSettingsService->settings();
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{active: bool}
     */
    public function roomStatus(array $body): array
    {
        return $this->run(function () use ($body): array {
            $this->store->pruneOldRows();
            $room = $this->cleanRoom($body['room'] ?? null);

            return ['active' => $this->roomHasJoinablePeer($room)];
        });
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{peers: list<array{id: string, name: string}>, sessionKey: string|null}
     */
    public function join(Request $request, array $body): array
    {
        return $this->run(function () use ($request, $body): array {
            $this->store->ensureOwnerColumn();
            $this->store->pruneOldRows();

            $username = $this->actors->tryAuthenticatedUsername($request);
            $room = $this->cleanRoom($body['room'] ?? null);
            $peerId = $this->store->cleanPeer($body['peerId'] ?? null);
            $name = mb_substr((string) ($body['name'] ?? ''), 0, 64);
            $isKnockRequest = str_starts_with($name, self::KNOCK_NAME_PREFIX);
            $guestSessionKey = null;
            $ownerMarker = $this->actors->ownerMarkerForAuthenticatedUser($username);
            if ($ownerMarker === null) {
                if ($isKnockRequest && ! $this->roomHasJoinablePeer($room)) {
                    $this->fail('room_not_active', 404);
                }
                $guestSessionKey = $this->actors->readGuestSessionKey($body) ?? $this->actors->newGuestSessionKey();
                $ownerMarker = $this->actors->ownerMarkerForGuestSession($guestSessionKey);
            }

            $this->store->upsertPeer($room, $peerId, $name, $ownerMarker, time());

            if ($this->store->countPeers($room) > self::MAX_PEERS_PER_ROOM) {
                $this->store->deletePeer($room, $peerId);
                $this->fail('room_full', 409);
            }

            return [
                'peers' => $this->store->peerList($room, $peerId),
                'sessionKey' => $guestSessionKey,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{peers: list<array{id: string, name: string}>, messages: list<array<string, mixed>>}
     */
    public function poll(Request $request, array $body): array
    {
        return $this->run(function () use ($request, $body): array {
            $this->store->ensureOwnerColumn();
            $this->store->pruneOldRows();

            $ownerMarker = $this->actors->requireActorMarker($request, $body);
            $room = $this->cleanRoom($body['room'] ?? null);
            $peerId = $this->store->cleanPeer($body['peerId'] ?? null);
            $this->store->assertPeerOwnedByActor($room, $peerId, $ownerMarker);

            return $this->store->poll($room, $peerId, max(0, (int) ($body['since'] ?? 0)));
        });
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true}
     */
    public function send(Request $request, array $body): array
    {
        return $this->run(function () use ($request, $body): array {
            $this->store->ensureOwnerColumn();
            $this->store->pruneOldRows();

            $ownerMarker = $this->actors->requireActorMarker($request, $body);
            $room = $this->cleanRoom($body['room'] ?? null);
            $from = $this->store->readSendFrom($body);
            $to = $this->store->cleanPeer($body['to'] ?? null);
            $this->store->assertPeerOwnedByActor($room, $from, $ownerMarker);

            $type = (string) ($body['type'] ?? '');
            $this->store->send($room, $from, $to, $type, $body['payload'] ?? null);

            return ['ok' => true];
        });
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true}
     */
    public function leave(Request $request, array $body): array
    {
        return $this->run(function () use ($request, $body): array {
            $this->store->ensureOwnerColumn();
            $this->store->pruneOldRows();

            $ownerMarker = $this->actors->requireActorMarker($request, $body);
            $room = $this->cleanRoom($body['room'] ?? null);
            $peerId = $this->store->cleanPeer($body['peerId'] ?? null);
            $this->store->assertPeerOwnedByActor($room, $peerId, $ownerMarker);
            $this->store->leave($room, $peerId);

            return ['ok' => true];
        });
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true, delivered: int}
     */
    public function chat(Request $request, array $body): array
    {
        return $this->run(function () use ($request, $body): array {
            $this->store->ensureOwnerColumn();
            $this->store->pruneOldRows();

            $ownerMarker = $this->actors->requireActorMarker($request, $body);
            $room = $this->cleanRoom($body['room'] ?? null);
            $from = $this->store->cleanPeer($body['from'] ?? null);
            $this->store->assertPeerOwnedByActor($room, $from, $ownerMarker);

            $text = trim((string) ($body['text'] ?? ''));
            $text = mb_substr($text, 0, 2000);
            if ($text === '') {
                $this->fail('empty_text');
            }

            if (! $this->store->peerExists($room, $from)) {
                $this->fail('not_in_room');
            }

            $payload = json_encode(['text' => $text], JSON_THROW_ON_ERROR);
            if (strlen($payload) > 12_000) {
                $this->fail('payload_too_large', 413);
            }

            $policy = $this->store->policy();
            $targets = DB::connection('wgw')->table($policy->peersTable)
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
            DB::connection('wgw')->table($policy->messagesTable)->insert($rows);

            return ['ok' => true, 'delivered' => count($targets)];
        });
    }

    private function roomHasJoinablePeer(string $room): bool
    {
        $policy = $this->store->policy();
        $rows = DB::connection('wgw')->table($policy->peersTable)
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

    /**
     * @template T
     *
     * @param  callable(): T  $action
     * @return T
     */
    private function run(callable $action)
    {
        try {
            return $action();
        } catch (RtcSignalingException $exception) {
            throw new VoiceResponseException($exception->status, $exception->payload);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
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
