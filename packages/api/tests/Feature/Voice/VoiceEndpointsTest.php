<?php

declare(strict_types=1);

namespace Tests\Feature\Voice;

use Illuminate\Support\Facades\DB;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class VoiceEndpointsTest extends TestCase
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
        DB::purge('wgw');

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

    public function test_room_status_empty_room(): void
    {
        $response = $this->postJson('/api/v1/voice/room', [
            'room' => 'daily-room',
        ]);

        $response->assertOk();
        $response->assertJson(['active' => false]);
    }

    public function test_guest_join_returns_session_key_and_peers(): void
    {
        $response = $this->postJson('/api/v1/voice/join', [
            'room' => 'daily-room',
            'peerId' => 'peer-alpha',
            'name' => 'Guest One',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['peers', 'sessionKey']);
        $this->assertIsString($response->json('sessionKey'));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', (string) $response->json('sessionKey'));
    }

    public function test_poll_requires_session_or_auth(): void
    {
        $response = $this->postJson('/api/v1/voice/poll', [
            'room' => 'daily-room',
            'peerId' => 'peer-alpha',
        ]);

        $response->assertUnauthorized();
        $response->assertJson(['error' => 'auth_required']);
    }

    public function test_guest_join_poll_leave_flow(): void
    {
        $join = $this->postJson('/api/v1/voice/join', [
            'room' => 'daily-room',
            'peerId' => 'peer-alpha',
            'name' => 'Guest One',
        ]);
        $join->assertOk();
        $sessionKey = (string) $join->json('sessionKey');

        $poll = $this->postJson('/api/v1/voice/poll', [
            'room' => 'daily-room',
            'peerId' => 'peer-alpha',
            'sessionKey' => $sessionKey,
        ]);
        $poll->assertOk();
        $poll->assertJsonStructure(['peers', 'messages']);

        $leave = $this->postJson('/api/v1/voice/leave', [
            'room' => 'daily-room',
            'peerId' => 'peer-alpha',
            'sessionKey' => $sessionKey,
        ]);
        $leave->assertOk();
        $leave->assertJson(['ok' => true]);
    }

    public function test_room_active_after_guest_join(): void
    {
        $this->postJson('/api/v1/voice/join', [
            'room' => 'daily-room',
            'peerId' => 'peer-alpha',
            'name' => 'Guest One',
        ])->assertOk();

        $room = $this->postJson('/api/v1/voice/room', ['room' => 'daily-room']);
        $room->assertOk();
        $room->assertJson(['active' => true]);
    }

    public function test_guest_rejoin_reuses_session_key(): void
    {
        $first = $this->postJson('/api/v1/voice/join', [
            'room' => 'daily-room',
            'peerId' => 'peer-one',
            'name' => 'Guest',
        ]);
        $first->assertOk();
        $sessionKey = (string) $first->json('sessionKey');

        $this->postJson('/api/v1/voice/leave', [
            'room' => 'daily-room',
            'peerId' => 'peer-one',
            'sessionKey' => $sessionKey,
        ])->assertOk();

        $second = $this->postJson('/api/v1/voice/join', [
            'room' => 'daily-room',
            'peerId' => 'peer-two',
            'name' => 'Guest',
            'sessionKey' => $sessionKey,
        ]);
        $second->assertOk();
        $this->assertSame($sessionKey, $second->json('sessionKey'));

        $this->postJson('/api/v1/voice/poll', [
            'room' => 'daily-room',
            'peerId' => 'peer-two',
            'sessionKey' => $sessionKey,
        ])->assertOk();
    }
}
