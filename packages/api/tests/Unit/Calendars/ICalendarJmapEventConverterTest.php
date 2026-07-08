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

    public function test_relative_valarm_reads_as_jmap_alert(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:alarm-1\r\nSUMMARY:Meeting\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT15M\r\nDESCRIPTION:Reminder\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertArrayHasKey('alerts', $event);
        $this->assertSame('display', $event['alerts']['alert1']['action']);
        $this->assertSame('RelativeAlert', $event['alerts']['alert1']['trigger']['@type']);
        $this->assertSame('-PT15M', $event['alerts']['alert1']['trigger']['offset']);
    }

    public function test_absolute_valarm_reads_as_jmap_alert(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:alarm-2\r\nSUMMARY:Meeting\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER;VALUE=DATE-TIME:20260615T094500Z\r\nDESCRIPTION:Reminder\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame('AbsoluteAlert', $event['alerts']['alert1']['trigger']['@type']);
        $this->assertSame('2026-06-15T09:45:00Z', $event['alerts']['alert1']['trigger']['when']);
    }

    public function test_valarm_action_types_map_to_jmap(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:alarm-3\r\nSUMMARY:Meeting\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nBEGIN:VALARM\r\nACTION:AUDIO\r\nTRIGGER;RELATED=END:-PT5M\r\nEND:VALARM\r\nBEGIN:VALARM\r\nACTION:EMAIL\r\nTRIGGER:-PT1H\r\nSUMMARY:Email reminder\r\nATTENDEE:mailto:bob@example.com\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame('audio', $event['alerts']['alert1']['action']);
        $this->assertSame('end', $event['alerts']['alert1']['trigger']['relatedTo']);
        $this->assertSame('email', $event['alerts']['alert2']['action']);
    }

    public function test_participant_scheduling_round_trip(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:sched-1\r\nSUMMARY:Meeting\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nORGANIZER;CN=Alice:mailto:alice@example.com\r\nATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN=Bob:mailto:bob@example.com\r\nATTENDEE;CUTYPE=RESOURCE;ROLE=OPT-PARTICIPANT;PARTSTAT=DECLINED;DELEGATED-TO=\"mailto:carol@example.com\";CN=Room A:mailto:room@example.com\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame(['owner'], $event['participants']['org']['roles']);
        $this->assertSame('individual', $event['participants']['att1']['kind']);
        $this->assertTrue($event['participants']['att1']['expectReply']);
        $this->assertSame('resource', $event['participants']['att2']['kind']);
        $this->assertSame('optional', $event['participants']['att2']['roles'][0]);
        $this->assertSame('carol@example.com', $event['participants']['att2']['delegatedTo']);

        $roundTrip = $this->converter->icsFromEvent($event);
        $defolded = str_replace("\r\n ", '', $roundTrip);
        $this->assertStringContainsString('ROLE=REQ-PARTICIPANT', $defolded);
        $this->assertStringContainsString('CUTYPE=INDIVIDUAL', $defolded);
        $this->assertStringContainsString('RSVP=TRUE', $defolded);
        $this->assertStringContainsString('mailto:carol@example.com', $defolded);
    }

    public function test_geo_url_and_virtual_location_round_trip(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:loc-1\r\nSUMMARY:Online\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nLOCATION:Zoom Room\r\nGEO:37.386013;-122.082932\r\nURL:https://meet.example.com/room\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame('Zoom Room', $event['locations']['loc1']['name']);
        $this->assertSame('geo:37.386013;-122.082932', $event['locations']['loc1']['coordinates']);
        $this->assertSame('https://meet.example.com/room', $event['links']['link1']['href']);

        $roundTrip = $this->converter->icsFromEvent($event);
        $this->assertStringContainsString('GEO:37.386013;-122.082932', $roundTrip);
        $this->assertStringContainsString('https://meet.example.com/room', $roundTrip);
    }

    public function test_rdate_and_exrule_round_trip(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:rdate-1\r\nSUMMARY:Series\r\nDTSTART:20260601T080000Z\r\nDTEND:20260601T083000Z\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nRDATE:20260615T080000Z\r\nEXRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=1\r\nEXDATE:20260608T080000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertArrayHasKey('2026-06-15T08:00:00Z', $event['recurrenceOverrides']);
        $this->assertSame([], $event['recurrenceOverrides']['2026-06-15T08:00:00Z']);
        $this->assertCount(1, $event['excludedRecurrenceRules']);

        $roundTrip = $this->converter->icsFromEvent($event);
        $this->assertStringContainsString('RDATE:20260615T080000Z', $roundTrip);
        $this->assertStringContainsString('EXRULE:', $roundTrip);
    }

    public function test_tentative_status_maps_to_free_busy_status(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:tent-1\r\nSUMMARY:Tentative\r\nDTSTART:20260615T100000Z\r\nDTEND:20260615T110000Z\r\nSTATUS:TENTATIVE\r\nTRANSP:OPAQUE\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame('tentative', $event['status']);
        $this->assertSame('tentative', $event['freeBusyStatus']);
    }

    public function test_rrule_by_set_position_round_trip(): void
    {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:bypos\r\nSUMMARY:Last Friday\r\nDTSTART:20260601T080000Z\r\nDTEND:20260601T083000Z\r\nRRULE:FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        $event = $this->converter->eventFromIcs($ics);
        $this->assertSame('monthly', $event['recurrenceRules'][0]['frequency']);
        $this->assertSame(['FR'], $event['recurrenceRules'][0]['byDay']);
        $this->assertSame([-1], $event['recurrenceRules'][0]['bySetPosition']);

        $roundTrip = $this->converter->icsFromEvent($event);
        $this->assertStringContainsString('RRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1', $roundTrip);
    }

    public function test_alerts_round_trip_to_valarm(): void
    {
        $event = [
            '@type' => 'Event',
            'uid' => 'alarm-rt',
            'calendarIds' => ['default' => true],
            'title' => 'Meeting',
            'start' => '2026-06-15T10:00:00Z',
            'end' => '2026-06-15T11:00:00Z',
            'alerts' => [
                'a1' => [
                    '@type' => 'Alert',
                    'action' => 'display',
                    'trigger' => [
                        '@type' => 'RelativeAlert',
                        'offset' => '-PT15M',
                    ],
                ],
                'a2' => [
                    '@type' => 'Alert',
                    'action' => 'display',
                    'trigger' => [
                        '@type' => 'AbsoluteAlert',
                        'when' => '2026-06-15T09:45:00Z',
                    ],
                ],
            ],
        ];

        $ics = $this->converter->icsFromEvent($event);
        $this->assertStringContainsString('BEGIN:VALARM', $ics);
        $this->assertStringContainsString('TRIGGER:-PT15M', $ics);
        $this->assertStringContainsString('TRIGGER;VALUE=DATE-TIME:20260615T094500Z', $ics);

        $roundTrip = $this->converter->eventFromIcs($ics);
        $this->assertSame('-PT15M', $roundTrip['alerts']['alert1']['trigger']['offset']);
        $this->assertSame('2026-06-15T09:45:00Z', $roundTrip['alerts']['alert2']['trigger']['when']);
    }
}
