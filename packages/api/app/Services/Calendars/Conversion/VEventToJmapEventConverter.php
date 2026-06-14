<?php

declare(strict_types=1);

namespace App\Services\Calendars\Conversion;

use Sabre\VObject\Component\VAlarm;
use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VEvent;
use Sabre\VObject\Property;
use Sabre\VObject\Reader;

final class VEventToJmapEventConverter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function convertAll(string $ics): array
    {
        $document = Reader::read($ics);
        if (! $document instanceof VCalendar) {
            throw new \InvalidArgumentException('Input is not an iCalendar document.');
        }

        $events = [];
        foreach (RecurrenceOverrideSupport::groupRecurrenceSeries(
            CalendarConversionSupport::veventsFromCalendar($document)
        ) as $series) {
            $event = $this->convertVEvent($series['master'], $document);
            if ($series['overrides'] !== []) {
                $overrides = RecurrenceOverrideSupport::recurrenceOverridesFromVevents(
                    $series['master'],
                    $series['overrides'],
                );
                if ($overrides !== []) {
                    $event['recurrenceOverrides'] = $overrides;
                }
            }
            $events[] = $event;
        }

        if ($events === []) {
            throw new \InvalidArgumentException('No VEVENT component found in iCalendar document.');
        }

        return $events;
    }

    /**
     * @return array<string, mixed>
     */
    public function convert(string $ics): array
    {
        return $this->convertAll($ics)[0];
    }

    /**
     * @return array<string, mixed>
     */
    public function convertVEvent(VEvent $vevent, VCalendar $document): array
    {
        $event = [
            '@type' => 'Event',
        ];

        if (isset($vevent->UID)) {
            $event['uid'] = trim((string) $vevent->UID->getValue());
        } else {
            $event['uid'] = CalendarConversionSupport::generateUid((string) $vevent->serialize());
        }

        if (isset($vevent->SUMMARY)) {
            $event['title'] = trim((string) $vevent->SUMMARY->getValue());
        }

        if (isset($vevent->DESCRIPTION)) {
            $description = trim((string) $vevent->DESCRIPTION->getValue());
            if ($description !== '') {
                $event['description'] = $description;
            }
        }

        $showWithoutTime = false;
        $timeZone = null;

        if (isset($vevent->DTSTART)) {
            $start = CalendarConversionSupport::jmapDateTimeFromProperty($vevent->DTSTART);
            $event['start'] = $start['value'];
            $showWithoutTime = $start['showWithoutTime'];
            $timeZone = $start['timeZone'];
        }

        if (isset($vevent->DTEND)) {
            $end = CalendarConversionSupport::jmapDateTimeFromProperty($vevent->DTEND);
            $event['end'] = $end['value'];
            $showWithoutTime = $showWithoutTime || $end['showWithoutTime'];
            $timeZone ??= $end['timeZone'];
        } elseif (isset($vevent->DURATION)) {
            $event['duration'] = trim((string) $vevent->DURATION->getValue());
        }

        if ($showWithoutTime) {
            $event['showWithoutTime'] = true;
        }

        if ($timeZone !== null && $timeZone !== '') {
            $event['timeZone'] = $timeZone;
        }

        if (isset($vevent->RRULE)) {
            $rules = [];
            foreach ($vevent->select('RRULE') as $property) {
                $rules[] = CalendarConversionSupport::recurrenceRuleFromProperty($property);
            }
            if ($rules !== []) {
                $event['recurrenceRules'] = $rules;
            }
        }

        if (isset($vevent->EXDATE)) {
            $excluded = [];
            foreach ($vevent->select('EXDATE') as $property) {
                foreach (explode(',', (string) $property->getValue()) as $part) {
                    $part = trim($part);
                    if ($part !== '') {
                        $excluded[] = CalendarConversionSupport::normalizeUtcDateTime($part);
                    }
                }
            }
            if ($excluded !== []) {
                $event['excludedRecurrenceDates'] = array_values(array_unique($excluded));
            }
        }

        if (isset($vevent->LOCATION)) {
            $location = trim((string) $vevent->LOCATION->getValue());
            if ($location !== '') {
                $event['locations'] = [
                    'loc1' => [
                        '@type' => 'Location',
                        'name' => $location,
                    ],
                ];
            }
        }

        if (isset($vevent->STATUS)) {
            $status = strtolower(trim((string) $vevent->STATUS->getValue()));
            if (in_array($status, ['confirmed', 'cancelled', 'tentative'], true)) {
                $event['status'] = $status;
            }
        }

        if (isset($vevent->TRANSP)) {
            $transp = strtolower(trim((string) $vevent->TRANSP->getValue()));
            $event['freeBusyStatus'] = $transp === 'transparent' ? 'free' : 'busy';
        }

        if (isset($vevent->CLASS)) {
            $class = strtolower(trim((string) $vevent->CLASS->getValue()));
            if (in_array($class, ['public', 'private', 'confidential'], true)) {
                $event['privacy'] = $class === 'confidential' ? 'secret' : $class;
            }
        }

        if (isset($vevent->CREATED)) {
            $event['created'] = CalendarConversionSupport::normalizeUtcDateTime((string) $vevent->CREATED->getValue());
        }

        if (isset($vevent->{'LAST-MODIFIED'})) {
            $event['updated'] = CalendarConversionSupport::normalizeUtcDateTime((string) $vevent->{'LAST-MODIFIED'}->getValue());
        } elseif (isset($vevent->DTSTAMP)) {
            $event['updated'] = CalendarConversionSupport::normalizeUtcDateTime((string) $vevent->DTSTAMP->getValue());
        }

        if (isset($vevent->SEQUENCE)) {
            $event['sequence'] = (int) $vevent->SEQUENCE->getValue();
        }

        if (isset($vevent->PRIORITY)) {
            $event['priority'] = (int) $vevent->PRIORITY->getValue();
        }

        if (isset($vevent->CATEGORIES)) {
            $categories = [];
            foreach ($vevent->CATEGORIES as $category) {
                $categories = array_merge($categories, $category->getParts());
            }
            $categories = array_values(array_filter(array_map('trim', $categories), static fn (string $v): bool => $v !== ''));
            if ($categories !== []) {
                $event['categories'] = $categories;
            }
        }

        $this->convertParticipants($vevent, $event);
        $this->convertAlerts($vevent, $event);
        $this->convertIcsProps($document, $vevent, $event);

        return $event;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function convertParticipants(VEvent $vevent, array &$event): void
    {
        $participants = [];
        $index = 0;

        if (isset($vevent->ORGANIZER)) {
            $participants['org'] = [
                '@type' => 'Participant',
                'name' => $this->participantNameFromProperty($vevent->ORGANIZER),
                'email' => $this->emailFromCalAddress((string) $vevent->ORGANIZER->getValue()),
                'roles' => ['owner'],
            ];
        }

        if (isset($vevent->ATTENDEE)) {
            foreach ($vevent->ATTENDEE as $attendee) {
                $id = 'att'.(++$index);
                $roles = ['attendee'];
                $partstat = isset($attendee['PARTSTAT']) ? strtolower((string) $attendee['PARTSTAT']) : null;
                $entry = [
                    '@type' => 'Participant',
                    'name' => $this->participantNameFromProperty($attendee),
                    'email' => $this->emailFromCalAddress((string) $attendee->getValue()),
                    'roles' => $roles,
                ];
                if ($partstat !== null && $partstat !== '') {
                    $entry['participationStatus'] = $partstat;
                }
                $participants[$id] = $entry;
            }
        }

        if ($participants !== []) {
            $event['participants'] = $participants;
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function convertAlerts(VEvent $vevent, array &$event): void
    {
        $alerts = [];
        $index = 0;

        foreach ($vevent->select('VALARM') as $valarm) {
            if (! $valarm instanceof VAlarm) {
                continue;
            }
            $alert = CalendarConversionSupport::alertFromValarm($valarm);
            if ($alert !== null) {
                $alerts['alert'.(++$index)] = $alert;
            }
        }

        if ($alerts !== []) {
            $event['alerts'] = $alerts;
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function convertIcsProps(VCalendar $document, VEvent $vevent, array &$event): void
    {
        $known = [
            'UID', 'SUMMARY', 'DESCRIPTION', 'DTSTART', 'DTEND', 'DURATION', 'RRULE', 'EXDATE',
            'LOCATION', 'STATUS', 'TRANSP', 'CLASS', 'CREATED', 'LAST-MODIFIED', 'DTSTAMP',
            'SEQUENCE', 'PRIORITY', 'CATEGORIES', 'ORGANIZER', 'ATTENDEE', 'RECURRENCE-ID',
        ];

        $props = [];
        foreach ($vevent->children() as $child) {
            if (! $child instanceof Property) {
                continue;
            }
            $name = strtoupper($child->name);
            if (in_array($name, $known, true)) {
                continue;
            }
            $props[$name] = trim((string) $child->getValue());
        }

        if ($props !== []) {
            $event['icsProps'] = $props;
        }
    }

    private function participantNameFromProperty(Property $property): ?string
    {
        if (isset($property['CN'])) {
            $name = trim((string) $property['CN']);
            if ($name !== '') {
                return $name;
            }
        }

        return null;
    }

    private function emailFromCalAddress(string $value): ?string
    {
        $value = trim($value);
        if (str_starts_with(strtolower($value), 'mailto:')) {
            return substr($value, 7);
        }

        return $value !== '' ? $value : null;
    }
}
