<?php

declare(strict_types=1);

namespace Tests\Feature\Collab;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use App\Services\Settings\SettingKeys;
use Tests\Support\RoomTestHelper;
use Tests\Support\WgwDatabaseTestCase;

final class CollabEndpointsTest extends WgwDatabaseTestCase
{
    private const ROOM = 'docs/test-together.md';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();

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
        $this->postJson('/api/v1/rooms/'.$this->roomId().'/participants', [
            'name' => 'Alice',
        ])->assertUnauthorized();
    }

    public function test_rtc_settings_returns_meet_ice_values_for_authenticated_user(): void
    {
        AppSetting::setValue(SettingKeys::RTC_STUN_URL, 'stun.example.test:3478,stuns:stun2.example.test:5349');
        AppSetting::setValue(SettingKeys::RTC_TURN_URL, 'turn.example.test:3478?transport=udp');
        AppSetting::setValue(SettingKeys::RTC_TURN_USERNAME, 'rtc-user');
        AppSetting::setValue(SettingKeys::RTC_TURN_CREDENTIAL, 'rtc-secret');

        $token = $this->issueToken('alice');
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/rooms/'.$this->roomId().'/configuration')
            ->assertOk()
            ->assertJsonPath('rtc.stunUrls', 'stun:stun.example.test:3478, stuns:stun2.example.test:5349')
            ->assertJsonPath('rtc.turnUrls', 'turn:turn.example.test:3478?transport=udp')
            ->assertJsonPath('rtc.turnUsername', 'rtc-user')
            ->assertJsonPath('rtc.turnPassword', 'rtc-secret')
            ->assertJsonMissingPath('meet.forceRelay');
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
        $roomId = $this->roomId();

        $aliceJoin = $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/rooms/'.$roomId.'/participants', [
                'name' => 'Alice',
            ]);
        $aliceJoin->assertOk();
        $aliceJoin->assertJsonStructure(['peerId', 'peers']);
        $alicePeerId = (string) $aliceJoin->json('peerId');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{16}$/', $alicePeerId);

        $bobJoin = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->postJson('/api/v1/rooms/'.$roomId.'/participants', [
                'name' => 'Bob',
            ]);
        $bobJoin->assertOk();
        $bobPeerId = (string) $bobJoin->json('peerId');
        $bobJoin->assertJsonPath('peers.0.id', $alicePeerId);

        $offerPayload = ['type' => 'offer', 'sdp' => 'v=0'];
        $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->postJson('/api/v1/rooms/'.$roomId.'/events', [
                'peerId' => $alicePeerId,
                'to' => $bobPeerId,
                'type' => 'offer',
                'payload' => $offerPayload,
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $poll = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->getJson('/api/v1/rooms/'.$roomId.'/events?peerId='.$bobPeerId.'&since=0');
        $poll->assertOk();
        $poll->assertJsonPath('peers.0.id', $alicePeerId);
        $messages = $poll->json('messages');
        $this->assertIsArray($messages);
        $this->assertCount(1, $messages);
        $this->assertSame('offer', $messages[0]['type']);
        $this->assertSame($alicePeerId, $messages[0]['from']);
        $this->assertSame($offerPayload, $messages[0]['payload']);

        $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->deleteJson('/api/v1/rooms/'.$roomId.'/participants/'.$alicePeerId)
            ->assertOk()
            ->assertJson(['ok' => true]);

        $afterLeave = $this->withHeader('Authorization', 'Bearer '.$bobToken)
            ->getJson('/api/v1/rooms/'.$roomId.'/events?peerId='.$bobPeerId.'&since=0');
        $afterLeave->assertOk();
        $afterLeave->assertJsonPath('peers', []);
    }

    public function test_same_user_can_join_multiple_peers_in_same_room(): void
    {
        $token = $this->issueToken('alice');
        $roomId = $this->roomId();

        $first = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/rooms/'.$roomId.'/participants', [
                'name' => 'Alice',
            ]);
        $first->assertOk();
        $firstPeerId = (string) $first->json('peerId');

        $second = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/rooms/'.$roomId.'/participants', [
                'name' => 'Alice',
            ]);
        $second->assertOk();
        $secondPeerId = (string) $second->json('peerId');
        $this->assertNotSame($firstPeerId, $secondPeerId);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/rooms/'.$roomId.'/events?peerId='.$firstPeerId.'&since=0')
            ->assertOk();
    }

    private function roomId(): string
    {
        return RoomTestHelper::fileRoomId(self::ROOM);
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
