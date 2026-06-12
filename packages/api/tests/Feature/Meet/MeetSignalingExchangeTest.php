<?php

declare(strict_types=1);

namespace Tests\Feature\Meet;

use Tests\Support\MeetTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class MeetSignalingExchangeTest extends WgwDatabaseTestCase
{
    use MeetTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpMeetFixtures();
    }

    public function test_two_guests_exchange_signaling_messages(): void
    {
        $host = $this->guestJoin('host-peer', 'Host');
        $guest = $this->guestJoin('guest-peer', 'Guest');

        $offerPayload = ['type' => 'offer', 'sdp' => 'v=0'];
        $this->postJson($this->meetRoomPath('/events'), [
            'from' => 'guest-peer',
            'to' => 'host-peer',
            'type' => 'offer',
            'payload' => $offerPayload,
            'sessionKey' => $guest['sessionKey'],
        ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $poll = $this->getJson($this->meetRoomPath('/events?peerId=host-peer&sessionKey='.$host['sessionKey']));
        $poll->assertOk();
        $messages = $poll->json('messages');
        $this->assertIsArray($messages);
        $this->assertCount(1, $messages);
        $this->assertSame('offer', $messages[0]['type']);
        $this->assertSame('guest-peer', $messages[0]['from']);
        $this->assertSame($offerPayload, $messages[0]['payload']);
    }

    public function test_poll_delete_on_read_does_not_redeliver_messages(): void
    {
        $host = $this->guestJoin('host-peer', 'Host');
        $guest = $this->guestJoin('guest-peer', 'Guest');

        $this->postJson($this->meetRoomPath('/events'), [
            'from' => 'guest-peer',
            'to' => 'host-peer',
            'type' => 'ice',
            'payload' => ['candidate' => 'abc'],
            'sessionKey' => $guest['sessionKey'],
        ])->assertOk();

        $firstPoll = $this->getJson($this->meetRoomPath('/events?peerId=host-peer&sessionKey='.$host['sessionKey']));
        $firstPoll->assertOk();
        $this->assertCount(1, $firstPoll->json('messages'));

        $secondPoll = $this->getJson($this->meetRoomPath('/events?peerId=host-peer&sessionKey='.$host['sessionKey']));
        $secondPoll->assertOk();
        $this->assertSame([], $secondPoll->json('messages'));
    }

    public function test_invalid_signaling_type_returns_bad_type(): void
    {
        $guest = $this->guestJoin('guest-peer', 'Guest');

        $this->postJson($this->meetRoomPath('/events'), [
            'from' => 'guest-peer',
            'to' => 'host-peer',
            'type' => 'foo',
            'payload' => [],
            'sessionKey' => $guest['sessionKey'],
        ])
            ->assertStatus(400)
            ->assertJson(['error' => 'bad_type']);
    }

    public function test_leave_removes_peer_from_roster(): void
    {
        $host = $this->guestJoin('host-peer', 'Host');
        $guest = $this->guestJoin('guest-peer', 'Guest');

        $this->deleteJson($this->meetRoomPath('/participants/guest-peer'), [
            'sessionKey' => $guest['sessionKey'],
        ])->assertOk();

        $poll = $this->getJson($this->meetRoomPath('/events?peerId=host-peer&sessionKey='.$host['sessionKey']));
        $poll->assertOk();
        $poll->assertJsonPath('peers', []);
    }

    public function test_authenticated_users_exchange_answer_messages(): void
    {
        $bobToken = $this->userBearerToken();
        $aliceToken = $this->adminBearerToken();

        $this->withBearer($bobToken)
            ->postJson($this->meetRoomPath('/participants'), [
                'peerId' => 'bob-peer',
                'name' => 'Bob',
            ])
            ->assertOk();

        $this->withBearer($aliceToken)
            ->postJson($this->meetRoomPath('/participants'), [
                'peerId' => 'alice-peer',
                'name' => 'Alice',
            ])
            ->assertOk();

        $answerPayload = ['type' => 'answer', 'sdp' => 'v=0'];
        $this->withBearer($aliceToken)
            ->postJson($this->meetRoomPath('/events'), [
                'from' => 'alice-peer',
                'to' => 'bob-peer',
                'type' => 'answer',
                'payload' => $answerPayload,
            ])
            ->assertOk();

        $poll = $this->withBearer($bobToken)
            ->getJson($this->meetRoomPath('/events?peerId=bob-peer'));
        $poll->assertOk();
        $poll->assertJsonPath('messages.0.type', 'answer');
        $poll->assertJsonPath('messages.0.from', 'alice-peer');
        $poll->assertJsonPath('messages.0.payload', $answerPayload);
    }

    public function test_delete_participant_me_resolves_peer_from_body(): void
    {
        $guest = $this->guestJoin('solo-peer', 'Solo');

        $this->deleteJson($this->meetRoomPath('/participants/me'), [
            'peerId' => 'solo-peer',
            'sessionKey' => $guest['sessionKey'],
        ])
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
