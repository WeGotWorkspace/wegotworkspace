<?php

declare(strict_types=1);

namespace App\Services\Calendars\Conversion;

use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VEvent;
use Sabre\VObject\Component\VTimeZone;
use Sabre\VObject\Reader;

/**
 * VTIMEZONE ↔ JMAP timeZones map on CalendarEvent.
 */
final class TimeZoneSupport
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public static function timeZonesFromCalendar(VCalendar $calendar, ?string $eventTimeZone = null): array
    {
        $zones = [];
        foreach ($calendar->select('VTIMEZONE') as $component) {
            if (! $component instanceof VTimeZone) {
                continue;
            }
            $tzid = isset($component->TZID) ? trim((string) $component->TZID->getValue()) : '';
            if ($tzid === '') {
                continue;
            }
            $zones[$tzid] = [
                '@type' => 'TimeZone',
                'tzid' => $tzid,
                'icsDefinition' => $component->serialize(),
            ];
        }

        if ($eventTimeZone !== null && $eventTimeZone !== '' && ! isset($zones[$eventTimeZone])) {
            $zones[$eventTimeZone] = [
                '@type' => 'TimeZone',
                'tzid' => $eventTimeZone,
            ];
        }

        return $zones;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    public static function attachTimeZonesToEvent(VCalendar $calendar, array &$event): void
    {
        $eventTimeZone = isset($event['timeZone']) && is_string($event['timeZone']) ? $event['timeZone'] : null;
        $zones = self::timeZonesFromCalendar($calendar, $eventTimeZone);
        if ($zones !== []) {
            $event['timeZones'] = $zones;
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    public static function writeTimeZonesToCalendar(VCalendar $calendar, array $event): void
    {
        $timeZones = $event['timeZones'] ?? null;
        if (! is_array($timeZones)) {
            return;
        }

        foreach ($timeZones as $zone) {
            if (! is_array($zone)) {
                continue;
            }
            $definition = $zone['icsDefinition'] ?? null;
            if (! is_string($definition) || trim($definition) === '') {
                continue;
            }
            if (! str_contains($definition, 'BEGIN:VTIMEZONE')) {
                continue;
            }

            $parsed = Reader::read($definition);
            if (! $parsed instanceof VCalendar) {
                continue;
            }
            foreach ($parsed->select('VTIMEZONE') as $component) {
                if ($component instanceof VTimeZone) {
                    $calendar->add($component);

                    break;
                }
            }
        }
    }

    /**
     * Collect TZIDs referenced on a VEVENT for timezone preservation.
     *
     * @return list<string>
     */
    public static function referencedTimeZoneIds(VEvent $vevent): array
    {
        $ids = [];
        foreach (['DTSTART', 'DTEND', 'RECURRENCE-ID'] as $name) {
            if (isset($vevent->{$name}['TZID'])) {
                $tzid = trim((string) $vevent->{$name}['TZID']);
                if ($tzid !== '') {
                    $ids[] = $tzid;
                }
            }
        }

        return array_values(array_unique($ids));
    }
}
