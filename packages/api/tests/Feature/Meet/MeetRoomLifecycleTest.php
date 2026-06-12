<?php

declare(strict_types=1);

namespace Tests\Feature\Meet;

use Tests\Support\MeetTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class MeetRoomLifecycleTest extends WgwDatabaseTestCase
{
    use MeetTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpMeetFixtures();
    }

    public function test_empty_room_is_not_active(): void
    {
        $this->getJson($this->meetStatusPath())
            ->assertOk()
            ->assertJson(['active' => false]);
    }

    public function test_create_room_returns_room_id(): void
    {
        $response = $this->postJson('/api/v1/meetings/rooms', []);

        $response->assertCreated();
        $response->assertJsonStructure(['roomId', 'active']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{16}$/', (string) $response->json('roomId'));
        $response->assertJson(['active' => false]);
    }

    public function test_create_room_accepts_client_supplied_room_id(): void
    {
        $roomId = 'client-room-01';

        $this->postJson('/api/v1/meetings/rooms', ['room' => $roomId])
            ->assertCreated()
            ->assertJson(['roomId' => $roomId, 'active' => false]);
    }

    public function test_room_becomes_active_after_guest_join(): void
    {
        $this->guestJoin('host-peer', 'Host');

        $this->getJson($this->meetStatusPath())
            ->assertOk()
            ->assertJson(['active' => true]);
    }

    public function test_room_inactive_after_all_peers_leave(): void
    {
        $join = $this->guestJoin('solo-peer', 'Solo');

        $this->deleteJson($this->meetRoomPath('/participants/solo-peer'), [
            'sessionKey' => $join['sessionKey'],
        ])->assertOk();

        $this->getJson($this->meetStatusPath())
            ->assertOk()
            ->assertJson(['active' => false]);
    }

    public function test_authenticated_join_makes_room_active(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->postJson($this->meetRoomPath('/participants'), [
                'peerId' => 'bob-peer',
                'name' => 'Bob',
            ])
            ->assertOk();

        $this->getJson($this->meetStatusPath())
            ->assertOk()
            ->assertJson(['active' => true]);
    }
}
