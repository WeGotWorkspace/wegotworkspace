<?php

declare(strict_types=1);

namespace Tests\Feature\Calendars;

use App\Models\CalendarObject;
use App\Services\Calendars\CalendarEventMapper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CalendarsTestFixtures;
use Tests\Support\OptimisticConcurrencyTestHelpers;
use Tests\Support\WgwDatabaseTestCase;

/**
 * CalDAV ↔ REST round-trip interoperability for the calendars domain.
 */
final class CalendarsCalDavInteropTest extends WgwDatabaseTestCase
{
    use CalendarsTestFixtures;
    use OptimisticConcurrencyTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCalendarsFixtures();
    }

    public function test_rest_create_persists_readable_ics_in_caldav_storage(): void
    {
        $uid = 'urn:uuid:'.Str::uuid()->toString();
        $payload = [
            'uid' => $uid,
            'calendarIds' => ['default' => true],
            'title' => 'Interop Event',
            'start' => '2026-07-01T09:00:00Z',
            'end' => '2026-07-01T10:00:00Z',
        ];

        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/events', $payload);

        $response->assertCreated();
        $eventId = (string) $response->json('id');
        $stored = $this->findBobEvent($eventId);
        $this->assertNotNull($stored);

        $ics = is_string($stored->calendardata) ? $stored->calendardata : (string) $stored->calendardata;
        $this->assertStringContainsString('SUMMARY:Interop Event', $ics);
        $this->assertStringContainsString('UID:'.$uid, $ics);
        $this->assertSame(
            $stored->uri,
            str_ends_with($eventId, '.ics') ? $eventId : $eventId.'.ics',
        );
    }

    public function test_rest_create_updates_caldav_search_index(): void
    {
        $uid = 'urn:uuid:'.Str::uuid()->toString();
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/calendars/events', [
                'uid' => $uid,
                'calendarIds' => ['default' => true],
                'title' => 'Searchable Event',
                'start' => '2026-07-01T09:00:00Z',
                'end' => '2026-07-01T10:00:00Z',
            ]);

        $response->assertCreated();
        $eventId = (string) $response->json('id');
        $stored = $this->findBobEvent($eventId);
        $this->assertNotNull($stored);

        $sourceKey = $this->calDavSearchSourceKey('bob', 'default', (string) $stored->uri);
        $row = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'caldav')
            ->where('source_key', $sourceKey)
            ->first();

        $this->assertNotNull($row, 'REST create should index the CalDAV event.');
        $this->assertSame('calendar', $row->category);
        $this->assertSame('bob', $row->owner_username);
        $this->assertStringContainsString('Searchable Event', (string) $row->title);

        $search = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'Searchable',
                'sources' => ['caldav'],
                'limit' => 10,
            ]));

        $search->assertOk();
        $sourceTypes = array_map(
            static fn (array $hit): string => (string) ($hit['sourceType'] ?? ''),
            $search->json('data.results') ?? [],
        );
        $this->assertContains('caldav', $sourceTypes);
    }

    public function test_caldav_seeded_event_readable_via_rest(): void
    {
        $uid = 'urn:uuid:'.Str::uuid()->toString();
        $eventId = $this->seedEventViaPdo('bob', 'caldav-seeded.ics', $this->sampleIcs('CalDAV Seeded', $uid));

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/events/'.$eventId)
            ->assertOk()
            ->assertJsonPath('uid', $uid)
            ->assertJsonPath('title', 'CalDAV Seeded');
    }

    public function test_rest_update_rewrites_stored_ics(): void
    {
        $eventId = $this->seedEventViaPdo('bob', 'update-me.ics', $this->sampleIcs('Before Update'));
        $url = '/api/v1/calendars/events/'.$eventId;

        $this->withBearer($this->userBearerToken())
            ->putJson($url, [
                'calendarIds' => ['default' => true],
                'title' => 'After Update',
                'start' => '2026-08-01T09:00:00Z',
                'end' => '2026-08-01T10:00:00Z',
            ], $this->withIfMatch($this->fetchEtagFromGet($url)))
            ->assertOk();

        $stored = $this->findBobEvent($eventId);
        $this->assertNotNull($stored);
        $ics = is_string($stored->calendardata) ? $stored->calendardata : (string) $stored->calendardata;
        $this->assertStringContainsString('SUMMARY:After Update', $ics);
        $this->assertStringNotContainsString('Before Update', $ics);
    }

    private function findBobEvent(string $eventId): ?CalendarObject
    {
        $uri = str_ends_with($eventId, '.ics') ? $eventId : CalendarEventMapper::eventUriFromId($eventId);

        return CalendarObject::query()
            ->where('uri', $uri)
            ->whereHas('calendar.instances', function ($query): void {
                $query->where('principaluri', 'principals/bob');
            })
            ->first();
    }

    private function calDavSearchSourceKey(string $username, string $calendarUri, string $eventUri): string
    {
        return $username.'|'.$calendarUri.'|'.$eventUri;
    }
}
