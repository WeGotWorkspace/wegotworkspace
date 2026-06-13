<?php

declare(strict_types=1);

namespace App\Services\Calendars\Conversion;

/**
 * Bidirectional iCalendar VEVENT ↔ JMAP CalendarEvent converter.
 *
 * Recurring events are returned with recurrenceRules (RRULE); clients expand
 * instances locally, consistent with the JMAP Calendars draft.
 */
final class ICalendarJmapEventConverter
{
    public function __construct(
        private readonly VEventToJmapEventConverter $reader = new VEventToJmapEventConverter,
        private readonly JmapEventToVEventConverter $writer = new JmapEventToVEventConverter,
    ) {}

    /**
     * @return array<string, mixed> JMAP CalendarEvent
     */
    public function eventFromIcs(string $ics): array
    {
        return $this->reader->convert($ics);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function eventsFromIcs(string $ics): array
    {
        return $this->reader->convertAll($ics);
    }

    /**
     * @param  array<string, mixed>  $event  JMAP CalendarEvent
     */
    public function icsFromEvent(array $event): string
    {
        return $this->writer->convert($event);
    }

    /**
     * Replace one VEVENT inside a multi-component ICS document.
     *
     * @param  array<string, mixed>  $event
     */
    public function updateVEventInIcs(string $ics, array $event, string $targetUid): string
    {
        return $this->writer->updateVEventInIcs($ics, $event, $targetUid);
    }

    /**
     * Remove one VEVENT; returns null when no VEVENT components remain.
     */
    public function removeVEventFromIcs(string $ics, string $targetUid): ?string
    {
        return $this->writer->removeVEventFromIcs($ics, $targetUid);
    }
}
