<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use App\Storage\WgwStorage;
use Tests\Support\DocsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class DocsCollabDriveTest extends WgwDatabaseTestCase
{
    use DocsTestFixtures;

    private const GROUP_PLAN = '/groups/team/plan.md';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDocsFixtures();
    }

    protected function tearDown(): void
    {
        $this->tearDownDocsFixtures();
        parent::tearDown();
    }

    public function test_group_member_reads_empty_markdown_when_file_missing(): void
    {
        $token = $this->userBearerToken();

        $response = $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8');

        $this->assertSame('', $response->getContent());
    }

    public function test_group_member_persists_collaboration_markdown(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN), [
                'markdown' => "# Plan\n\nShip docs tests.",
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN))
            ->assertOk()
            ->assertSeeText('Ship docs tests.');

        $stored = (string) app(WgwStorage::class)->files()->get('groups/team/plan.md');
        $this->assertStringContainsString('# Plan', $stored);
    }

    public function test_yjs_sidecar_round_trips_with_collaboration_put(): void
    {
        $token = $this->userBearerToken();
        $yjsBytes = [1, 2, 3, 255];

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN), [
                'markdown' => "# Plan\n\nWith Yjs.\n",
                'yjs' => $yjsBytes,
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $storage = app(WgwStorage::class)->files();
        $this->assertSame(
            "\x01\x02\x03\xff",
            $storage->get('groups/team/.plan.md.yjs')
        );

        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN).'&format=yjs')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/octet-stream')
            ->assertContent("\x01\x02\x03\xff");
    }

    public function test_non_member_cannot_read_or_write_group_collaboration(): void
    {
        $carolToken = $this->carolBearerToken();

        $this->withBearer($carolToken)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN))
            ->assertForbidden()
            ->assertJsonPath('error', 'forbidden');

        $this->withBearer($carolToken)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN), [
                'markdown' => 'blocked',
            ])
            ->assertForbidden()
            ->assertJsonPath('error', 'forbidden');
    }

    public function test_admin_with_group_membership_can_collaborate_on_team_drive(): void
    {
        $token = $this->adminBearerToken();

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN), [
                'markdown' => "# Admin plan\n",
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN))
            ->assertOk()
            ->assertSeeText('# Admin plan');
    }

    public function test_oversized_collaboration_markdown_returns_payload_too_large(): void
    {
        $token = $this->userBearerToken();
        $oversized = str_repeat('x', 2_097_153);

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_PLAN), [
                'markdown' => $oversized,
            ])
            ->assertStatus(413)
            ->assertJsonPath('error', 'markdown_too_large');
    }
}
