<?php

declare(strict_types=1);

namespace Tests\Feature\Search;

use App\Models\Principal;
use App\Models\User;
use App\Services\Search\SearchIndexerService;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwTestDisks;

final class UnifiedSearchEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-search-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        WgwTestDisks::refresh($this->dataDir);
        $this->configureWgwJwtKeys();

        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
        User::query()->create([
            'username' => 'bob',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/bob',
            'email' => 'bob@example.test',
            'displayname' => 'Bob',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_unified_search_returns_file_calendar_and_contact_hits(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/project-plan.md', "# Project plan\nAlpha launch notes");

        DB::connection('wgw')->table('calendars')->insert([
            'id' => 1,
            'synctoken' => 1,
            'components' => 'VEVENT,VTODO,VJOURNAL',
        ]);
        DB::connection('wgw')->table('calendarinstances')->insert([
            'id' => 1,
            'calendarid' => 1,
            'principaluri' => 'principals/alice',
            'access' => 1,
            'uri' => 'default',
            'displayname' => 'Default',
        ]);
        DB::connection('wgw')->table('calendarobjects')->insert([
            'calendardata' => "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-1\r\nSUMMARY:Alpha Kickoff\r\nDESCRIPTION:Project alpha planning\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
            'uri' => 'alpha-kickoff.ics',
            'calendarid' => 1,
            'lastmodified' => time(),
            'etag' => '"a1"',
            'size' => 120,
            'componenttype' => 'VEVENT',
            'firstoccurence' => time(),
            'lastoccurence' => time(),
            'uid' => 'test-1',
        ]);

        DB::connection('wgw')->table('addressbooks')->insert([
            'id' => 1,
            'principaluri' => 'principals/alice',
            'displayname' => 'Contacts',
            'uri' => 'default',
            'description' => null,
            'synctoken' => 1,
        ]);
        DB::connection('wgw')->table('cards')->insert([
            'addressbookid' => 1,
            'carddata' => "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Alpha Partner\r\nN:Partner;Alpha;;;\r\nADR;TYPE=HOME:;;Main Street 5;Amsterdam;;;Netherlands\r\nNOTE:Strategic collaborator\r\nEND:VCARD\r\n",
            'uri' => 'alpha-partner.vcf',
            'lastmodified' => time(),
            'etag' => '"c1"',
            'size' => 140,
        ]);

        app(SearchIndexerService::class)->reindexAll();

        $token = $this->issueBearerToken();
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'alpha',
                'limit' => 20,
            ]));

        $response->assertOk()
            ->assertJsonPath('data.query', 'alpha');

        $results = $response->json('data.results');
        $this->assertIsArray($results);
        $sourceTypes = array_map(static fn (array $row): string => (string) ($row['sourceType'] ?? ''), $results);
        $this->assertContains('file', $sourceTypes);
        $this->assertContains('caldav', $sourceTypes);
        $this->assertContains('carddav', $sourceTypes);
    }

    public function test_unified_search_supports_filters_date_range_and_auth_scope(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/meeting-alpha.md', 'alpha note body');
        app(WgwStorage::class)->files()->put('users/alice/meeting-alpha.csv', "name,value\nalpha,1");
        app(WgwStorage::class)->files()->put('users/bob/secretbob.md', 'secretbob private for bob');

        app(SearchIndexerService::class)->reindexAll();

        $token = $this->issueBearerToken();
        $filtered = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'alpha',
                'sources' => ['file'],
                'extensions' => ['md'],
                'categories' => ['document'],
                'modified_from' => gmdate('c', 0),
                'modified_to' => gmdate('c', time() + 10),
                'limit' => 50,
            ]));

        $filtered->assertOk()
            ->assertJsonPath('data.filters.extensions.0', 'md')
            ->assertJsonPath('data.filters.categories.0', 'document')
            ->assertJsonPath('data.sources.0', 'file');

        $results = $filtered->json('data.results');
        $this->assertIsArray($results);
        $this->assertNotEmpty($results);
        foreach ($results as $result) {
            $this->assertSame('file', $result['sourceType']);
            $this->assertSame('md', $result['extension']);
            $this->assertSame('document', $result['category']);
            $this->assertStringStartsWith('users/alice/', (string) $result['sourceKey']);
        }

        $scoped = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'secretbob',
                'sources' => ['file'],
                'limit' => 20,
            ]));
        $scoped->assertOk()->assertJsonPath('data.results', []);
    }

    public function test_unified_search_indexes_calendar_events_for_group_principals(): void
    {
        $group = Principal::query()->create([
            'uri' => 'principals/groups/administrators',
            'email' => null,
            'displayname' => 'Administrators',
        ]);
        $alice = Principal::query()->where('uri', 'principals/alice')->firstOrFail();
        DB::connection('wgw')->table('groupmembers')->insert([
            'principal_id' => $group->id,
            'member_id' => $alice->id,
        ]);

        DB::connection('wgw')->table('calendars')->insert([
            'id' => 9,
            'synctoken' => 1,
            'components' => 'VEVENT',
        ]);
        DB::connection('wgw')->table('calendarinstances')->insert([
            'id' => 9,
            'calendarid' => 9,
            'principaluri' => 'principals/groups/administrators',
            'access' => 1,
            'uri' => 'team',
            'displayname' => 'Team Calendar',
        ]);
        DB::connection('wgw')->table('calendarobjects')->insert([
            'calendardata' => "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:grp-1\r\nSUMMARY:Group Standup\r\nDESCRIPTION:Daily sync for admins\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
            'uri' => 'group-standup.ics',
            'calendarid' => 9,
            'lastmodified' => time(),
            'etag' => '"g1"',
            'size' => 170,
            'componenttype' => 'VEVENT',
            'firstoccurence' => time(),
            'lastoccurence' => time(),
            'uid' => 'grp-1',
        ]);

        app(SearchIndexerService::class)->reindexAll();

        $indexed = DB::connection('wgw')
            ->table('search_documents')
            ->where('source_type', 'caldav')
            ->where('source_key', 'groups/administrators|team|group-standup.ics')
            ->first();

        $this->assertNotNull($indexed);
        $this->assertSame('Group Standup', $indexed->title);

        $token = $this->issueBearerToken();
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'standup',
                'sources' => ['caldav'],
                'limit' => 20,
            ]));

        $response->assertOk();
        $sourceKeys = array_column((array) $response->json('data.results'), 'sourceKey');
        $this->assertContains('groups/administrators|team|group-standup.ics', $sourceKeys);
    }

    public function test_unified_search_indexes_markdown_body_as_plain_text(): void
    {
        app(WgwStorage::class)->files()->put(
            'users/alice/plain-md.md',
            "---\ntitle: Sprint\naudience: team-alpha\n---\n# Sprint plan\n- [Release Notes](https://example.test/release)\n**Ship** the _feature_ with `command --flag`\n"
        );

        app(SearchIndexerService::class)->reindexAll();

        $indexed = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'file')
            ->where('source_key', 'users/alice/plain-md.md')
            ->first();

        $this->assertNotNull($indexed);
        $this->assertIsString($indexed->body_text);
        $this->assertStringContainsString('Sprint plan', (string) $indexed->body_text);
        $this->assertStringContainsString('Release Notes', (string) $indexed->body_text);
        $this->assertStringContainsString('Ship the feature with command --flag', (string) $indexed->body_text);
        $this->assertStringNotContainsString('audience: team-alpha', (string) $indexed->body_text);
        $this->assertStringNotContainsString('[Release Notes](', (string) $indexed->body_text);
        $this->assertStringNotContainsString('**Ship**', (string) $indexed->body_text);
        $this->assertStringNotContainsString('`command --flag`', (string) $indexed->body_text);

        $metadata = json_decode((string) $indexed->metadata_json, true);
        $this->assertIsArray($metadata);
        $this->assertArrayHasKey('frontmatter', $metadata);
        $this->assertStringContainsString('audience: team-alpha', (string) $metadata['frontmatter']);
    }

    public function test_unified_search_skips_hidden_paths_but_keeps_notes_as_note_category(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/.secret.md', 'hidden should not index');
        app(WgwStorage::class)->files()->put('users/alice/.hidden/folder.md', 'hidden folder should not index');
        app(WgwStorage::class)->files()->put(
            'users/alice/.notes/n-123.md',
            "---\ntitle: My Note Title\n---\nMy note body\nsecond line"
        );

        app(SearchIndexerService::class)->reindexAll();

        $hiddenFile = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'file')
            ->where('source_key', 'users/alice/.secret.md')
            ->first();
        $hiddenFolderFile = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'file')
            ->where('source_key', 'users/alice/.hidden/folder.md')
            ->first();
        $noteFile = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'note')
            ->where('source_key', 'users/alice/.notes/n-123.md')
            ->first();

        $this->assertNull($hiddenFile);
        $this->assertNull($hiddenFolderFile);
        $this->assertNotNull($noteFile);
        $this->assertSame('note', $noteFile->category);
        $this->assertSame('note', $noteFile->source_subtype);
        $this->assertSame('My Note Title', $noteFile->title);
    }

    public function test_unified_search_updates_note_body_and_keeps_note_source_type(): void
    {
        $token = $this->issueBearerToken();
        $payload = [
            'id' => 'n-search',
            'notebook' => 'General',
            'title' => 'First Note Title',
            'body' => 'oldneedle123',
            'tags' => ['alpha'],
            'starred' => false,
            'archived' => false,
        ];

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/notes/items/n-search', $payload)
            ->assertOk();

        $firstSearch = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'oldneedle123',
                'sources' => ['note'],
                'limit' => 20,
            ]));
        $firstSearch->assertOk();
        $firstRows = (array) $firstSearch->json('data.results');
        $this->assertNotEmpty($firstRows);
        $this->assertSame('note', $firstRows[0]['sourceType'] ?? null);
        $this->assertSame('First Note Title', $firstRows[0]['title'] ?? null);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/notes/items/n-search', [
                ...$payload,
                'title' => 'Updated Note Title',
                'body' => 'newneedle456',
            ])
            ->assertOk();

        $staleSearch = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'oldneedle123',
                'sources' => ['note'],
                'limit' => 20,
            ]));
        $staleSearch->assertOk()->assertJsonPath('data.results', []);

        $updatedSearch = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'newneedle456',
                'sources' => ['note'],
                'limit' => 20,
            ]));
        $updatedSearch->assertOk();
        $updatedRows = (array) $updatedSearch->json('data.results');
        $this->assertNotEmpty($updatedRows);
        $this->assertSame('note', $updatedRows[0]['sourceType'] ?? null);
        $this->assertSame('Updated Note Title', $updatedRows[0]['title'] ?? null);
    }
}
