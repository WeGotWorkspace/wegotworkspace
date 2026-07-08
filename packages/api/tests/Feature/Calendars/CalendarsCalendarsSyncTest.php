<?php

declare(strict_types=1);

namespace Tests\Feature\Calendars;

use Tests\Support\CalendarsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class CalendarsCalendarsSyncTest extends WgwDatabaseTestCase
{
    use CalendarsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCalendarsFixtures();
    }

    public function test_calendar_changes_reports_created_calendar(): void
    {
        $initial = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars/changes')
            ->assertOk();

        $state = $initial->json('newState');
        $this->assertNotSame('', (string) $state);

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/calendars', [
                'name' => 'Sync calendar',
                'id' => 'sync-cal',
            ])
            ->assertCreated();

        $changes = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars/changes?since='.$state)
            ->assertOk();

        $changes->assertJsonPath('created.0', 'sync-cal');
    }
}
