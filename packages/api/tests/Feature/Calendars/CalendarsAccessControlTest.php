<?php

declare(strict_types=1);

namespace Tests\Feature\Calendars;

use App\Support\WgwSettings;
use Tests\Support\CalendarsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class CalendarsAccessControlTest extends WgwDatabaseTestCase
{
    use CalendarsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCalendarsFixtures();
    }

    public function test_guest_cannot_access_calendars_endpoints(): void
    {
        $this->getJson('/api/v1/calendars/calendars')->assertUnauthorized();
        $this->getJson('/api/v1/calendars/calendars/default')->assertUnauthorized();
        $this->getJson('/api/v1/calendars/events?calendarId=default')->assertUnauthorized();
        $this->getJson('/api/v1/calendars/events/demo')->assertUnauthorized();
        $this->postJson('/api/v1/calendars/events', [])->assertUnauthorized();
        $this->putJson('/api/v1/calendars/events/demo', [])->assertUnauthorized();
        $this->patchJson('/api/v1/calendars/events/demo', [])->assertUnauthorized();
        $this->deleteJson('/api/v1/calendars/events/demo')->assertUnauthorized();
    }

    public function test_authenticated_user_can_access_calendars_when_enabled(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->getJson('/api/v1/calendars/calendars')->assertOk();
        $this->withBearer($token)->getJson('/api/v1/calendars/events?calendarId=default')->assertOk();
    }

    public function test_calendars_disabled_returns_forbidden(): void
    {
        $this->setAppSetting(WgwSettings::CALENDAR_ENABLED, false);
        $token = $this->userBearerToken();

        $this->withBearer($token)->getJson('/api/v1/calendars/calendars')->assertForbidden();
        $this->withBearer($token)->getJson('/api/v1/calendars/calendars/default')->assertForbidden();
        $this->withBearer($token)->getJson('/api/v1/calendars/events?calendarId=default')->assertForbidden();
        $this->withBearer($token)->postJson('/api/v1/calendars/events', [])->assertForbidden();
    }
}
