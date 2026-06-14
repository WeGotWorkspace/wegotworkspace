<?php

declare(strict_types=1);

namespace App\Services\Calendars;

use App\Services\Calendars\Conversion\RecurrenceOverrideSupport;
use App\Services\Calendars\Conversion\VEventToJmapEventConverter;
use DateTimeImmutable;
use DateTimeZone;
use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Reader;
use Sabre\VObject\Recur\EventIterator;
use Sabre\VObject\Recur\NoInstancesException;

/**
 * Server-side recurrence expansion using Sabre EventIterator (#159).
 */
final class CalendarEventExpansionService
{
    public function __construct(
        private readonly VEventToJmapEventConverter $reader = new VEventToJmapEventConverter,
    ) {}

    /**
     * @param  array<string, mixed>  $masterEvent
     * @return list<array<string, mixed>>
     */
    public function expandInWindow(
        array $masterEvent,
        string $ics,
        string $calendarUri,
        string $after,
        string $before,
    ): array {
        if (! $this->isRecurring($masterEvent)) {
            return [$masterEvent];
        }

        $document = Reader::read($ics);
        if (! $document instanceof VCalendar) {
            return [$masterEvent];
        }

        $uid = is_string($masterEvent['uid'] ?? null) ? $masterEvent['uid'] : '';
        if ($uid === '') {
            return [$masterEvent];
        }

        $vevents = RecurrenceOverrideSupport::veventsForEventIterator($document, $uid);
        if ($vevents === []) {
            return [$masterEvent];
        }

        $timeZone = $this->resolveTimeZone($masterEvent);
        $start = new DateTimeImmutable($after, $timeZone);
        $end = new DateTimeImmutable($before, $timeZone);

        try {
            $iterator = new EventIterator($vevents, null, $timeZone);
        } catch (NoInstancesException) {
            return [];
        }

        $iterator->fastForward($start);
        $masterId = is_string($masterEvent['id'] ?? null) ? $masterEvent['id'] : '';
        $instances = [];

        while ($iterator->valid() && $iterator->getDtStart() < $end) {
            if ($iterator->getDtEnd() <= $start) {
                $iterator->next();

                continue;
            }

            $expandedVevent = $iterator->getEventObject();
            $instance = $this->reader->convertVEvent($expandedVevent, $document);
            $recurrenceId = isset($expandedVevent->{'RECURRENCE-ID'})
                ? RecurrenceOverrideSupport::recurrenceIdKeyFromProperty($expandedVevent->{'RECURRENCE-ID'})
                : $instance['start'] ?? '';

            $instance['id'] = $masterId.'/'.$this->encodeRecurrenceIdForId($recurrenceId);
            $instance['recurrenceId'] = $recurrenceId;
            $instance['recurrenceRules'] = null;
            unset($instance['recurrenceOverrides']);
            $instance['calendarIds'] = [$calendarUri => true];

            $instances[] = $instance;
            $iterator->next();
        }

        return $instances;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    public function isRecurring(array $event): bool
    {
        $rules = $event['recurrenceRules'] ?? null;
        if (is_array($rules) && $rules !== []) {
            return true;
        }

        $overrides = $event['recurrenceOverrides'] ?? null;
        if (! is_array($overrides)) {
            return false;
        }

        foreach ($overrides as $patch) {
            if (is_array($patch) && $patch === []) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function resolveTimeZone(array $event): DateTimeZone
    {
        $tzid = isset($event['timeZone']) && is_string($event['timeZone']) ? trim($event['timeZone']) : '';
        if ($tzid !== '') {
            try {
                return new DateTimeZone($tzid);
            } catch (\Exception) {
                // Fall through to UTC.
            }
        }

        return new DateTimeZone('UTC');
    }

    private function encodeRecurrenceIdForId(string $recurrenceId): string
    {
        return rawurlencode($recurrenceId);
    }
}
