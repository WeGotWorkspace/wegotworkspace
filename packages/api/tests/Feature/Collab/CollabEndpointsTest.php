<?php

declare(strict_types=1);

namespace Tests\Feature\Collab;

use App\Models\Principal;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class CollabEndpointsTest extends TestCase
{
    private const ROOM = 'docs/test-together.md';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

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

        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applyAuthTables();
        SqliteWgwSchema::applyCollabTables();

        User::query()->insert([
            'id' => 1,
            'username' => 'alice',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->insert([
            'id' => 1,
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
    }

    public function test_join_requires_auth(): void
    {
        $this->postJson('/api/v1/collab/join', [
            'room' => self::ROOM,
            'name' => 'Alice',
        ])->assertUnauthorized();
    }

    public function test_two_users_exchange_signaling_messages(): void
    {
        User::query()->insert([
            'id' => 2,
            'username' => 'bob',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->insert([
            'id' => 2,
            'uri' => 'principals/bob',
            'email' => 'bob@example.test',
            'displayname' => 'Bob',
        ]);

        $aliceToken = $this->issueToken('alice');
        $bobToken = $this->issueToken('bob');

        $aliceJoin = $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/collab/join', [
                'room' => self::ROOM,
                'name' => 'Alice',
            ]);
        $aliceJoin->assertOk();
        $aliceJoin->assertJsonStructure(['peerId', 'peers']);
        $alicePeerId = (string) $aliceJoin->json('peerId');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{16}$/', $alicePeerId);

        $bobJoin = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->postJson('/api/v1/collab/join', [
                'room' => self::ROOM,
                'name' => 'Bob',
            ]);
        $bobJoin->assertOk();
        $bobPeerId = (string) $bobJoin->json('peerId');
        $bobJoin->assertJsonPath('peers.0.id', $alicePeerId);

        $offerPayload = ['type' => 'offer', 'sdp' => 'v=0'];
        $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/collab/send', [
                'room' => self::ROOM,
                'peerId' => $alicePeerId,
                'to' => $bobPeerId,
                'type' => 'offer',
                'payload' => $offerPayload,
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $poll = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->postJson('/api/v1/collab/poll', [
                'room' => self::ROOM,
                'peerId' => $bobPeerId,
                'since' => 0,
            ]);
        $poll->assertOk();
        $poll->assertJsonPath('peers.0.id', $alicePeerId);
        $messages = $poll->json('messages');
        $this->assertIsArray($messages);
        $this->assertCount(1, $messages);
        $this->assertSame('offer', $messages[0]['type']);
        $this->assertSame($alicePeerId, $messages[0]['from']);
        $this->assertSame($offerPayload, $messages[0]['payload']);

        $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/collab/leave', [
                'room' => self::ROOM,
                'peerId' => $alicePeerId,
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $afterLeave = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->postJson('/api/v1/collab/poll', [
                'room' => self::ROOM,
                'peerId' => $bobPeerId,
                'since' => 0,
            ]);
        $afterLeave->assertOk();
        $afterLeave->assertJsonPath('peers', []);
    }

    public function test_rejoin_same_user_evicts_previous_peer(): void
    {
        $token = $this->issueToken('alice');

        $first = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/collab/join', [
                'room' => self::ROOM,
                'name' => 'Alice',
            ]);
        $first->assertOk();
        $firstPeerId = (string) $first->json('peerId');

        $second = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/collab/join', [
                'room' => self::ROOM,
                'name' => 'Alice',
            ]);
        $second->assertOk();
        $secondPeerId = (string) $second->json('peerId');
        $this->assertNotSame($firstPeerId, $secondPeerId);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/collab/poll', [
                'room' => self::ROOM,
                'peerId' => $firstPeerId,
                'since' => 0,
            ])
            ->assertNotFound();
    }

    public function test_legacy_parity_signal_actions_work(): void
    {
        $aliceJoin = $this->postJson('/api/v1/collab/parity-signal', [
            'action' => 'join',
            'room' => self::ROOM,
            'name' => 'Alice',
        ]);
        $aliceJoin->assertOk();
        $alicePeerId = (string) $aliceJoin->json('peerId');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{16}$/', $alicePeerId);

        $bobJoin = $this->postJson('/api/v1/collab/parity-signal', [
            'action' => 'join',
            'room' => self::ROOM,
            'name' => 'Bob',
        ]);
        $bobJoin->assertOk();
        $bobPeerId = (string) $bobJoin->json('peerId');
        $bobJoin->assertJsonPath('peers.0.id', $alicePeerId);

        $offerPayload = ['type' => 'offer', 'sdp' => 'v=0'];
        $this->postJson('/api/v1/collab/parity-signal', [
            'action' => 'signal',
            'room' => self::ROOM,
            'peerId' => $alicePeerId,
            'to' => $bobPeerId,
            'type' => 'offer',
            'payload' => $offerPayload,
        ])->assertOk()->assertJson(['ok' => true]);

        $poll = $this->postJson('/api/v1/collab/parity-signal', [
            'action' => 'poll',
            'room' => self::ROOM,
            'peerId' => $bobPeerId,
            'since' => 0,
        ]);
        $poll->assertOk();
        $messages = $poll->json('messages');
        $this->assertIsArray($messages);
        $this->assertCount(1, $messages);
        $this->assertSame('offer', $messages[0]['type']);
        $this->assertSame($alicePeerId, $messages[0]['from']);
        $this->assertSame($offerPayload, $messages[0]['payload']);

        $this->postJson('/api/v1/collab/parity-signal', [
            'action' => 'leave',
            'room' => self::ROOM,
            'peerId' => $alicePeerId,
        ])->assertOk()->assertJson(['ok' => true]);

        $afterLeave = $this->postJson('/api/v1/collab/parity-signal', [
            'action' => 'poll',
            'room' => self::ROOM,
            'peerId' => $bobPeerId,
            'since' => 0,
        ]);
        $afterLeave->assertOk();
        $afterLeave->assertJsonPath('peers', []);
    }

    public function test_legacy_parity_signal_auth_requires_token(): void
    {
        $this->postJson('/api/v1/collab/parity-signal-auth', [
            'action' => 'join',
            'room' => self::ROOM,
            'name' => 'Alice',
        ])->assertUnauthorized();
    }

    public function test_legacy_parity_signal_auth_actions_work_with_token(): void
    {
        $aliceToken = $this->issueToken('alice');
        User::query()->insert([
            'id' => 2,
            'username' => 'bob',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->insert([
            'id' => 2,
            'uri' => 'principals/bob',
            'email' => 'bob@example.test',
            'displayname' => 'Bob',
        ]);
        $bobToken = $this->issueToken('bob');

        $aliceJoin = $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/collab/parity-signal-auth', [
                'action' => 'join',
                'room' => self::ROOM,
                'name' => 'Alice',
            ]);
        $aliceJoin->assertOk();
        $alicePeerId = (string) $aliceJoin->json('peerId');

        $bobJoin = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->postJson('/api/v1/collab/parity-signal-auth', [
                'action' => 'join',
                'room' => self::ROOM,
                'name' => 'Bob',
            ]);
        $bobJoin->assertOk();
        $bobPeerId = (string) $bobJoin->json('peerId');

        $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/collab/parity-signal-auth', [
                'action' => 'signal',
                'room' => self::ROOM,
                'peerId' => $alicePeerId,
                'to' => $bobPeerId,
                'type' => 'offer',
                'payload' => ['type' => 'offer', 'sdp' => 'v=0'],
            ])->assertOk()->assertJson(['ok' => true]);

        $poll = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->postJson('/api/v1/collab/parity-signal-auth', [
                'action' => 'poll',
                'room' => self::ROOM,
                'peerId' => $bobPeerId,
                'since' => 0,
            ]);
        $poll->assertOk();
        $messages = $poll->json('messages');
        $this->assertIsArray($messages);
        $this->assertCount(1, $messages);
        $this->assertSame('offer', $messages[0]['type']);
    }

    private function issueToken(string $username): string
    {
        $response = $this->postJson('/api/v1/auth/token', [
            'username' => $username,
            'password' => 'secret',
        ]);
        $response->assertOk();

        return (string) $response->json('access_token');
    }
}
