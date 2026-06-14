<?php

declare(strict_types=1);

namespace Tests\Unit\Calendars;

use App\Services\Calendars\Conversion\ICalendarJmapEventConverter;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Real-world iCalendar exports from Audriga's jmap-php-icalendar_vcard test resources.
 *
 * Assert parse success and deterministic round-trip (no exact golden match to Audriga JSON).
 *
 * @see packages/api/tests/fixtures/README.md
 */
final class ICalendarAudrigaInteropTest extends TestCase
{
    private ICalendarJmapEventConverter $converter;

    private string $fixturesDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->converter = new ICalendarJmapEventConverter;
        $this->fixturesDir = dirname(__DIR__, 2).'/fixtures/Calendars/Interop/audriga';
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function audrigaSingleEventFixtureProvider(): array
    {
        return [
            'icalendar_in_utc' => ['icalendar_in_utc'],
            'test_icalendar' => ['test_icalendar'],
        ];
    }

    #[DataProvider('audrigaSingleEventFixtureProvider')]
    public function test_audriga_ics_parses_to_jmap_event(string $fixture): void
    {
        $ics = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.ics");

        $event = $this->converter->eventFromIcs($ics);

        $this->assertSame('Event', $event['@type'] ?? null);
        $this->assertArrayHasKey('uid', $event);
        $this->assertNotSame('', (string) $event['uid']);
        $this->assertArrayHasKey('start', $event);
    }

    #[DataProvider('audrigaSingleEventFixtureProvider')]
    public function test_audriga_ics_parse_is_deterministic(string $fixture): void
    {
        $ics = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.ics");

        $first = $this->converter->eventFromIcs($ics);
        $second = $this->converter->eventFromIcs($ics);

        $this->assertSame($first, $second, "Re-parse should be stable for {$fixture}");
    }

    #[DataProvider('audrigaSingleEventFixtureProvider')]
    public function test_audriga_ics_round_trip_is_stable(string $fixture): void
    {
        $ics = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.ics");
        $event = $this->converter->eventFromIcs($ics);

        $roundTripIcs = $this->converter->icsFromEvent(array_merge($event, [
            'calendarIds' => ['default' => true],
        ]));
        $this->assertStringContainsString('BEGIN:VEVENT', $roundTripIcs);

        $once = $this->converter->eventFromIcs($roundTripIcs);
        $twice = $this->converter->eventFromIcs($roundTripIcs);

        $this->assertSame($once, $twice, "ICS round-trip re-parse should be stable for {$fixture}");
    }

    public function test_audriga_multi_event_calendar_reads_all_vevents(): void
    {
        $ics = (string) file_get_contents("{$this->fixturesDir}/calendar_with_two_events.ics");

        $events = $this->converter->eventsFromIcs($ics);

        $this->assertCount(2, $events);
        foreach ($events as $event) {
            $this->assertSame('Event', $event['@type'] ?? null);
            $this->assertArrayHasKey('uid', $event);
        }
    }
}
