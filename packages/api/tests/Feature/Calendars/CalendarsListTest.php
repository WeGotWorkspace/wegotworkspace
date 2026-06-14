<?php

declare(strict_types=1);

namespace Tests\Feature\Calendars;

use Tests\Support\CalendarsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class CalendarsListTest extends WgwDatabaseTestCase
{
    use CalendarsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCalendarsFixtures();
    }

    public function test_list_calendars_returns_default_calendar(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars');

        $response->assertOk()
            ->assertJsonCount(1, 'list')
            ->assertJsonPath('list.0.id', 'default')
            ->assertJsonPath('list.0.isDefault', true)
            ->assertJsonPath('list.0.myRights.mayRead', true)
            ->assertJsonPath('list.0.myRights.mayWrite', true);
    }

    public function test_show_calendar_returns_calendar(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars/default');

        $response->assertOk()
            ->assertJsonPath('id', 'default')
            ->assertJsonPath('isDefault', true);
    }

    public function test_show_unknown_calendar_returns_not_found(): void
    {
        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars/missing')
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }
}
