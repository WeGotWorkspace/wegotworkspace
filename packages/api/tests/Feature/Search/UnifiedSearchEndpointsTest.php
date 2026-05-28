<?php

declare(strict_types=1);

namespace Tests\Feature\Search;

use App\Models\Principal;
use App\Models\User;
use App\Services\Search\SearchIndexerService;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\Support\WgwTestDisks;
use Tests\TestCase;

final class UnifiedSearchEndpointsTest extends TestCase
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

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('wgw');

        $keys = AuthTestKeys::rsaPair();
        config([
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ]);

        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applyAuthTables();
        SqliteWgwSchema::applySabreTables();

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

        $token = $this->issueToken();
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/unified?'.http_build_query([
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

        $token = $this->issueToken();
        $filtered = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/search/unified?'.http_build_query([
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
            ->getJson('/api/v1/search/unified?'.http_build_query([
                'q' => 'secretbob',
                'sources' => ['file'],
                'limit' => 20,
            ]));
        $scoped->assertOk()->assertJsonPath('data.results', []);
    }

    private function issueToken(): string
    {
        return (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');
    }
}
