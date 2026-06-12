<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use Tests\Support\SettingsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class SettingsGroupsTest extends WgwDatabaseTestCase
{
    use SettingsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSettingsFixtures();
    }

    protected function tearDown(): void
    {
        $this->tearDownSettingsFixtures();
        parent::tearDown();
    }

    public function test_settings_state_includes_group_memberships_for_member(): void
    {
        $token = $this->userBearerToken();

        $state = $this->withBearer($token)->getJson('/api/v1/settings/state');
        $state->assertOk();

        $ids = array_column($state->json('groups'), 'id');
        $this->assertContains('principals/groups/team', $ids);
        $this->assertContains('principals/groups/support', $ids);

        $teamGroup = collect($state->json('groups'))->firstWhere('id', 'principals/groups/team');
        $this->assertSame('Team', $teamGroup['displayName'] ?? null);
    }

    public function test_settings_state_excludes_groups_user_does_not_belong_to(): void
    {
        $token = $this->carolBearerToken();

        $state = $this->withBearer($token)->getJson('/api/v1/settings/state');
        $state->assertOk();

        $ids = array_column($state->json('groups'), 'id');
        $this->assertNotContains('principals/groups/team', $ids);
        $this->assertNotContains('principals/groups/support', $ids);
    }
}
