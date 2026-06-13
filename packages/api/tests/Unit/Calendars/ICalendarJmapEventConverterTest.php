<?php

declare(strict_types=1);

namespace Tests\Unit\Calendars;

use App\Services\Calendars\Conversion\ICalendarJmapEventConverter;
use PHPUnit\Framework\TestCase;

final class ICalendarJmapEventConverterTest extends TestCase
{
    private ICalendarJmapEventConverter $converter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->converter = new ICalendarJmapEventConverter;
    }

    public function test_round_trip_simple_event(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-uid-1\r\nSUMMARY:Simple Event\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nDESCRIPTION:Notes here\r\nLOCATION:Room A\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame('Event', $event['@type']);
        $this->assertSame('test-uid-1', $event['uid']);
        $this->assertSame('Simple Event', $event['title']);
        $this->assertSame('2026-06-15T10:00:00Z', $event['start']);
        $this->assertSame('2026-06-15T11:00:00Z', $event['end']);
        $this->assertSame('Notes here', $event['description']);
        $this->assertSame('Room A', $event['locations']['loc1']['name']);

        $roundTrip = $this->converter->icsFromEvent(array_merge($event, [
            'calendarIds' => ['default' => true],
        ]));
        $this->assertStringContainsString('SUMMARY:Simple Event', $roundTrip);
        $this->assertStringContainsString('UID:test-uid-1', $roundTrip);
        $this->assertStringContainsString('LOCATION:Room A', $roundTrip);
    }

    public function test_recurring_event_preserves_rrule(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:recur\r\nSUMMARY:Daily\r\nDTSTART:20260601T080000Z\r\nDTEND:20260601T083000Z\r\nRRULE:FREQ=DAILY;INTERVAL=2;COUNT=5\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertCount(1, $event['recurrenceRules']);
        $this->assertSame('daily', $event['recurrenceRules'][0]['frequency']);
        $this->assertSame(2, $event['recurrenceRules'][0]['interval']);
        $this->assertSame(5, $event['recurrenceRules'][0]['count']);

        $roundTrip = $this->converter->icsFromEvent($event);
        $this->assertStringContainsString('RRULE:FREQ=DAILY;INTERVAL=2;COUNT=5', $roundTrip);
    }

    public function test_all_day_event_sets_show_without_time(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:allday\r\nSUMMARY:Holiday\r\nDTSTART;VALUE=DATE:20260704\r\nDTEND;VALUE=DATE:20260705\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertTrue($event['showWithoutTime']);
        $this->assertSame('2026-07-04', $event['start']);
    }

    public function test_multi_vevent_reads_all_events(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:a\r\nSUMMARY:First\r\nDTSTART:20260601T080000Z\r\nDTEND:20260601T090000Z\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:b\r\nSUMMARY:Second\r\nDTSTART:20260602T080000Z\r\nDTEND:20260602T090000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $events = $this->converter->eventsFromIcs($ics);
        $this->assertCount(2, $events);
        $this->assertSame('First', $events[0]['title']);
        $this->assertSame('Second', $events[1]['title']);
    }

    public function test_write_emits_single_vevent(): void
    {
        $ics = $this->converter->icsFromEvent([
            '@type' => 'Event',
            'uid' => 'write-1',
            'calendarIds' => ['default' => true],
            'title' => 'Written',
            'start' => '2026-06-15T10:00:00Z',
            'end' => '2026-06-15T11:00:00Z',
        ]);

        $this->assertSame(1, substr_count($ics, 'BEGIN:VEVENT'));
        $this->assertSame(1, substr_count($ics, 'END:VEVENT'));
    }
}
