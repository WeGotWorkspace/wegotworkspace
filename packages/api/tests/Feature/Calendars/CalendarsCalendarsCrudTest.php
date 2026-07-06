<?php

declare(strict_types=1);

namespace Tests\Feature\Calendars;

use Tests\Support\CalendarsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class CalendarsCalendarsCrudTest extends WgwDatabaseTestCase
{
    use CalendarsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCalendarsFixtures();
    }

    public function test_create_calendar_returns_new_calendar(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/calendars', [
                'name' => 'Work calendar',
                'id' => 'work',
                'description' => 'Work-only events',
            ]);

        $response->assertCreated()
            ->assertJsonPath('id', 'work')
            ->assertJsonPath('name', 'Work calendar')
            ->assertJsonPath('description', 'Work-only events')
            ->assertJsonPath('myRights.mayDelete', true);
    }

    public function test_patch_calendar_updates_name(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/calendars', [
                'name' => 'Side project',
                'id' => 'side',
            ])
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/calendars/calendars/side', [
                'name' => 'Side projects',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Side projects');
    }

    public function test_delete_empty_calendar_succeeds(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/calendars', [
                'name' => 'Temporary',
                'id' => 'temp-cal',
            ])
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/calendars/calendars/temp-cal')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars/temp-cal')
            ->assertNotFound();
    }

    public function test_delete_default_calendar_is_forbidden(): void
    {
        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/calendars/calendars/default')
            ->assertForbidden();
    }

    public function test_delete_calendar_with_events_requires_on_destroy_flag(): void
    {
        $this->seedEventViaPdo('bob', 'standup.ics', $this->sampleIcs('Standup'));

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/calendars', [
                'name' => 'Has events',
                'id' => 'has-events',
            ])
            ->assertCreated();

        $eventId = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/events', array_merge(
                $this->sampleCalendarEventPayload('has-events'),
                ['title' => 'In extra calendar'],
            ))
            ->assertCreated()
            ->json('id');

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/calendars/calendars/has-events')
            ->assertStatus(409);

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/calendars/calendars/has-events', [
                'onDestroyRemoveContents' => true,
            ])
            ->assertOk();

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/events/'.$eventId)
            ->assertNotFound();
    }

    public function test_share_with_is_rejected_on_patch(): void
    {
        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/calendars/calendars/default', [
                'shareWith' => ['alice' => ['mayRead' => true]],
            ])
            ->assertStatus(400)
            ->assertJsonPath('code', 'bad_request');
    }
}
