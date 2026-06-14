<?php

declare(strict_types=1);

namespace App\Services\Calendars\Conversion;

use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VEvent;
use Sabre\VObject\Reader;

final class JmapEventToVEventConverter
{
    /**
     * @param  array<string, mixed>  $event
     */
    public function convert(array $event): string
    {
        return $this->buildCalendar($event)->serialize();
    }

    /**
     * @param  array<string, mixed>  $event
     */
    public function updateVEventInIcs(string $ics, array $event, string $targetUid): string
    {
        $document = Reader::read($ics);
        if (! $document instanceof VCalendar) {
            throw new \InvalidArgumentException('Input is not an iCalendar document.');
        }

        $replaced = false;
        foreach (CalendarConversionSupport::veventsFromCalendar($document) as $vevent) {
            $uid = isset($vevent->UID) ? trim((string) $vevent->UID->getValue()) : '';
            if ($uid === $targetUid) {
                $document->remove($vevent);
                $replaced = true;
            }
        }

        if (! $replaced) {
            throw new \InvalidArgumentException('VEVENT with UID '.$targetUid.' not found.');
        }

        $event['uid'] = $targetUid;
        $this->appendSeriesVevents($document, $event);

        return $document->serialize();
    }

    public function removeVEventFromIcs(string $ics, string $targetUid): ?string
    {
        $document = Reader::read($ics);
        if (! $document instanceof VCalendar) {
            throw new \InvalidArgumentException('Input is not an iCalendar document.');
        }

        $removed = false;
        foreach (CalendarConversionSupport::veventsFromCalendar($document) as $vevent) {
            $uid = isset($vevent->UID) ? trim((string) $vevent->UID->getValue()) : '';
            if ($uid === $targetUid) {
                $document->remove($vevent);
                $removed = true;
            }
        }

        if (! $removed) {
            throw new \InvalidArgumentException('VEVENT with UID '.$targetUid.' not found.');
        }

        if (CalendarConversionSupport::veventsFromCalendar($document) === []) {
            return null;
        }

        return $document->serialize();
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function buildCalendar(array $event): VCalendar
    {
        $calendar = new VCalendar([], false);
        $calendar->add('VERSION', '2.0');
        $calendar->add('PRODID', '-//WeGotWorkspace//Calendars REST//EN');
        $this->appendSeriesVevents($calendar, $event);

        return $calendar;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function appendSeriesVevents(VCalendar $calendar, array $event): void
    {
        $this->populateVEvent($calendar->add('VEVENT', []), $event);
        $this->appendOverrideVevents($calendar, $event);
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function appendOverrideVevents(VCalendar $calendar, array $event): void
    {
        $overrides = $event['recurrenceOverrides'] ?? null;
        if (! is_array($overrides) || $overrides === []) {
            return;
        }

        $masterEvent = CalendarConversionSupport::normalizeEventMapKeys($event);
        foreach ($overrides as $recurrenceIdKey => $patch) {
            if (! is_string($recurrenceIdKey) || $recurrenceIdKey === '' || ! is_array($patch)) {
                continue;
            }

            $overrideVevent = $calendar->add('VEVENT', []);
            if (RecurrenceOverrideSupport::isExcludedOverride($patch)) {
                RecurrenceOverrideSupport::populateExcludedOverrideVEvent(
                    $overrideVevent,
                    $masterEvent,
                    $recurrenceIdKey,
                );

                continue;
            }

            $merged = CalendarConversionSupport::deepMergeEventPatch($masterEvent, $patch);
            $merged['uid'] = $masterEvent['uid'];
            $this->populateVEvent($overrideVevent, $merged);
            $this->stripMasterOnlyProperties($overrideVevent);
            RecurrenceOverrideSupport::writeRecurrenceIdProperty(
                $overrideVevent,
                $recurrenceIdKey,
                $masterEvent,
            );
            if (! isset($patch['start'])) {
                if (isset($overrideVevent->DTSTART)) {
                    $overrideVevent->remove('DTSTART');
                }
                CalendarConversionSupport::writeDateTimeProperty(
                    $overrideVevent,
                    'DTSTART',
                    $recurrenceIdKey,
                    (bool) ($masterEvent['showWithoutTime'] ?? false),
                    isset($masterEvent['timeZone']) && is_string($masterEvent['timeZone']) ? $masterEvent['timeZone'] : null,
                );
            }
        }
    }

    private function stripMasterOnlyProperties(VEvent $vevent): void
    {
        foreach (['RRULE', 'EXDATE', 'RDATE'] as $name) {
            if (isset($vevent->{$name})) {
                $vevent->remove($name);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function populateVEvent(VEvent $vevent, array $event): void
    {
        $event = CalendarConversionSupport::normalizeEventMapKeys($event);
        if (isset($vevent->UID)) {
            $vevent->UID->setValue((string) $event['uid']);
        } else {
            $vevent->add('UID', (string) $event['uid']);
        }

        if (isset($event['title']) && is_string($event['title'])) {
            $vevent->add('SUMMARY', $event['title']);
        }

        if (isset($event['description']) && is_string($event['description']) && $event['description'] !== '') {
            $vevent->add('DESCRIPTION', $event['description']);
        }

        $showWithoutTime = (bool) ($event['showWithoutTime'] ?? false);
        $timeZone = isset($event['timeZone']) && is_string($event['timeZone']) ? $event['timeZone'] : null;

        if (isset($event['start'])) {
            CalendarConversionSupport::writeDateTimeProperty(
                $vevent,
                'DTSTART',
                $event['start'],
                $showWithoutTime,
                $timeZone
            );
        }

        if (isset($event['end'])) {
            CalendarConversionSupport::writeDateTimeProperty(
                $vevent,
                'DTEND',
                $event['end'],
                $showWithoutTime,
                $timeZone
            );
        } elseif (isset($event['duration']) && is_string($event['duration'])) {
            $vevent->add('DURATION', $event['duration']);
        }

        if (isset($event['recurrenceRules']) && is_array($event['recurrenceRules'])) {
            foreach ($event['recurrenceRules'] as $rule) {
                if (is_array($rule)) {
                    $vevent->add('RRULE', CalendarConversionSupport::recurrenceRuleToIcs($rule));
                }
            }
        }

        if (isset($event['excludedRecurrenceDates']) && is_array($event['excludedRecurrenceDates']) && $event['excludedRecurrenceDates'] !== []) {
            $values = array_map(
                static fn (mixed $value): string => is_string($value)
                    ? CalendarConversionSupport::utcDateTimeToIcs($value)
                    : '',
                $event['excludedRecurrenceDates']
            );
            $values = array_values(array_filter($values, static fn (string $v): bool => $v !== ''));
            if ($values !== []) {
                $vevent->add('EXDATE', implode(',', $values));
            }
        }

        $this->writeLocations($vevent, $event);
        $this->writeStatusAndPrivacy($vevent, $event);
        $this->writeTimestamps($vevent, $event);
        $this->writeParticipants($vevent, $event);
        $this->writeAlerts($vevent, $event);
        $this->writeIcsProps($vevent, $event);

        $now = gmdate('Ymd\THis\Z');
        if (! isset($vevent->DTSTAMP)) {
            $vevent->add('DTSTAMP', $now);
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function writeLocations(VEvent $vevent, array $event): void
    {
        $locations = $event['locations'] ?? null;
        if (! is_array($locations)) {
            return;
        }

        foreach ($locations as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $name = $entry['name'] ?? $entry['description'] ?? null;
            if (is_string($name) && trim($name) !== '') {
                $vevent->add('LOCATION', trim($name));

                return;
            }
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function writeStatusAndPrivacy(VEvent $vevent, array $event): void
    {
        if (isset($event['status']) && is_string($event['status'])) {
            $vevent->add('STATUS', strtoupper($event['status']));
        }

        if (isset($event['freeBusyStatus']) && is_string($event['freeBusyStatus'])) {
            $vevent->add('TRANSP', $event['freeBusyStatus'] === 'free' ? 'TRANSPARENT' : 'OPAQUE');
        }

        if (isset($event['privacy']) && is_string($event['privacy'])) {
            $class = $event['privacy'] === 'secret' ? 'CONFIDENTIAL' : strtoupper($event['privacy']);
            $vevent->add('CLASS', $class);
        }

        if (isset($event['sequence'])) {
            $vevent->add('SEQUENCE', (string) (int) $event['sequence']);
        }

        if (isset($event['priority'])) {
            $vevent->add('PRIORITY', (string) (int) $event['priority']);
        }

        if (isset($event['categories']) && is_array($event['categories']) && $event['categories'] !== []) {
            $vevent->add('CATEGORIES', implode(',', array_map('strval', $event['categories'])));
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function writeTimestamps(VEvent $vevent, array $event): void
    {
        if (isset($event['created']) && is_string($event['created'])) {
            $vevent->add('CREATED', CalendarConversionSupport::utcDateTimeToIcs($event['created']));
        }

        if (isset($event['updated']) && is_string($event['updated'])) {
            $vevent->add('LAST-MODIFIED', CalendarConversionSupport::utcDateTimeToIcs($event['updated']));
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function writeParticipants(VEvent $vevent, array $event): void
    {
        $participants = $event['participants'] ?? null;
        if (! is_array($participants)) {
            return;
        }

        foreach ($participants as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $email = $entry['email'] ?? null;
            if (! is_string($email) || trim($email) === '') {
                continue;
            }
            $roles = $entry['roles'] ?? [];
            $params = ['CN' => $entry['name'] ?? $email];
            $address = str_starts_with($email, 'mailto:') ? $email : 'mailto:'.$email;

            if (is_array($roles) && in_array('owner', $roles, true)) {
                $vevent->add('ORGANIZER', $address, $params);

                continue;
            }

            if (isset($entry['participationStatus']) && is_string($entry['participationStatus'])) {
                $params['PARTSTAT'] = strtoupper($entry['participationStatus']);
            }
            $vevent->add('ATTENDEE', $address, $params);
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function writeAlerts(VEvent $vevent, array $event): void
    {
        $alerts = $event['alerts'] ?? null;
        if (! is_array($alerts)) {
            return;
        }

        $title = isset($event['title']) && is_string($event['title']) ? $event['title'] : null;
        foreach ($alerts as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            CalendarConversionSupport::writeValarm($vevent, $entry, $title);
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function writeIcsProps(VEvent $vevent, array $event): void
    {
        $props = $event['icsProps'] ?? null;
        if (! is_array($props)) {
            return;
        }

        foreach ($props as $name => $value) {
            if (! is_string($name) || ! is_string($value) || trim($value) === '') {
                continue;
            }
            $vevent->add(strtoupper($name), $value);
        }
    }
}
