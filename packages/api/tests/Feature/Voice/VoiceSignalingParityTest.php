<?php

declare(strict_types=1);

namespace Tests\Feature\Voice;

use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

/**
 * Runs the same guest signaling scenarios under legacy and Laravel backends.
 * Fails fast when implementations diverge before flipping WGW_VOICE_SIGNALING.
 */
final class VoiceSignalingParityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        \Illuminate\Support\Facades\DB::purge('wgw');

        $keys = AuthTestKeys::rsaPair();
        config([
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ]);

        SqliteWgwSchema::applyVoiceTables();
    }

    public function test_guest_room_join_poll_leave_match_between_backends(): void
    {
        $legacy = $this->runGuestFlow('legacy');
        $laravel = $this->runGuestFlow('laravel');

        $this->assertSame($legacy['room_empty'], $laravel['room_empty']);
        $this->assertSame($legacy['room_active'], $laravel['room_active']);
        $this->assertSame($legacy['poll_peers'], $laravel['poll_peers']);
        $this->assertSame($legacy['leave'], $laravel['leave']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $legacy['session_key']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $laravel['session_key']);
    }

    public function test_guest_rejoin_reuses_session_key_on_laravel(): void
    {
        config(['wgw.voice.signaling' => 'laravel']);

        $first = $this->postJson('/api/v1/voice/join', [
            'room' => 'parity-room',
            'peerId' => 'peer-one',
            'name' => 'Guest',
        ]);
        $first->assertOk();
        $sessionKey = (string) $first->json('sessionKey');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $sessionKey);

        $this->postJson('/api/v1/voice/leave', [
            'room' => 'parity-room',
            'peerId' => 'peer-one',
            'sessionKey' => $sessionKey,
        ])->assertOk();

        $second = $this->postJson('/api/v1/voice/join', [
            'room' => 'parity-room',
            'peerId' => 'peer-two',
            'name' => 'Guest',
            'sessionKey' => $sessionKey,
        ]);
        $second->assertOk();
        $this->assertSame($sessionKey, $second->json('sessionKey'));

        $poll = $this->postJson('/api/v1/voice/poll', [
            'room' => 'parity-room',
            'peerId' => 'peer-two',
            'sessionKey' => $sessionKey,
        ]);
        $poll->assertOk();
    }

    /**
     * @return array{
     *   room_empty: array<string, mixed>,
     *   room_active: array<string, mixed>,
     *   session_key: string,
     *   poll_peers: list<array<string, mixed>>,
     *   leave: array<string, mixed>
     * }
     */
    private function runGuestFlow(string $backend): array
    {
        config(['wgw.voice.signaling' => $backend]);
        SqliteWgwSchema::applyVoiceTables();

        $roomEmpty = $this->postJson('/api/v1/voice/room', ['room' => 'parity-room']);
        $roomEmpty->assertOk();

        $join = $this->postJson('/api/v1/voice/join', [
            'room' => 'parity-room',
            'peerId' => 'peer-alpha',
            'name' => 'Guest',
        ]);
        $join->assertOk();
        $sessionKey = (string) $join->json('sessionKey');

        $roomActive = $this->postJson('/api/v1/voice/room', ['room' => 'parity-room']);
        $roomActive->assertOk();

        $poll = $this->postJson('/api/v1/voice/poll', [
            'room' => 'parity-room',
            'peerId' => 'peer-alpha',
            'sessionKey' => $sessionKey,
        ]);
        $poll->assertOk();

        $leave = $this->postJson('/api/v1/voice/leave', [
            'room' => 'parity-room',
            'peerId' => 'peer-alpha',
            'sessionKey' => $sessionKey,
        ]);
        $leave->assertOk();

        return [
            'room_empty' => $roomEmpty->json(),
            'room_active' => $roomActive->json(),
            'session_key' => $sessionKey,
            'poll_peers' => $poll->json('peers'),
            'leave' => $leave->json(),
        ];
    }
}
