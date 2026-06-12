<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use App\Storage\WgwStorage;
use Tests\Support\DocsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class DocsCollabDriveTest extends WgwDatabaseTestCase
{
    use DocsTestFixtures;

    private const GROUP_DOC = '/groups/team/plan.md';

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

    public function test_group_member_reads_default_markdown_when_file_missing(): void
    {
        $token = $this->userBearerToken();

        $response = $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC));

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8')
            ->assertSeeText('# Collaborative document');
    }

    public function test_group_member_saves_and_loads_collaboration_markdown(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC), [
                'markdown' => "# Team plan\n\nShip the feature.\n",
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $storage = app(WgwStorage::class)->files();
        $stored = (string) $storage->get('groups/team/plan.md');
        $this->assertStringContainsString('# Team plan', $stored);
        $this->assertStringContainsString('Ship the feature.', $stored);

        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC))
            ->assertOk()
            ->assertSeeText('Ship the feature.');
    }

    public function test_group_member_yjs_sidecar_round_trip(): void
    {
        $token = $this->userBearerToken();
        $yjsBytes = [10, 20, 30, 255];

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC), [
                'markdown' => "# Plan\n",
                'yjs' => $yjsBytes,
            ])
            ->assertOk();

        $storage = app(WgwStorage::class)->files();
        $this->assertSame(
            "\x0a\x14\x1e\xff",
            $storage->get('groups/team/.plan.md.yjs')
        );

        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC).'&format=yjs')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/octet-stream')
            ->assertContent("\x0a\x14\x1e\xff");
    }

    public function test_admin_group_member_can_write_collaboration_document(): void
    {
        $token = $this->adminBearerToken();

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC), [
                'markdown' => "# Admin edit\n",
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC))
            ->assertOk()
            ->assertSeeText('# Admin edit');
    }

    public function test_non_member_cannot_read_or_write_group_collaboration_document(): void
    {
        $this->seedGroupFile('plan.md', '# Existing plan');
        $carolToken = $this->carolBearerToken();

        $this->withBearer($carolToken)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC))
            ->assertForbidden()
            ->assertJsonPath('error', 'forbidden');

        $this->withBearer($carolToken)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC), [
                'markdown' => 'intrusion',
            ])
            ->assertForbidden()
            ->assertJsonPath('error', 'forbidden');

        $this->assertStringContainsString(
            '# Existing plan',
            (string) app(WgwStorage::class)->files()->get('groups/team/plan.md')
        );
    }

    public function test_oversized_collaboration_markdown_returns_payload_too_large(): void
    {
        $token = $this->userBearerToken();
        $oversized = str_repeat('x', 2_097_153);

        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::GROUP_DOC), [
                'markdown' => $oversized,
            ])
            ->assertStatus(413)
            ->assertJsonPath('error', 'markdown_too_large');
    }

    public function test_missing_path_on_collaboration_returns_bad_request(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->get('/api/v1/files/collaboration')
            ->assertStatus(400)
            ->assertJsonPath('error', 'Missing path query parameter.');
    }
}
