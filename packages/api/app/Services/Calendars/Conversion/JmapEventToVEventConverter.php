<?php

declare(strict_types=1);

namespace App\Services\Calendars\Conversion;

use App\Services\VObject\VObjectPayloadGuard;
use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VEvent;

final class JmapEventToVEventConverter
{
    public function __construct(
        private readonly VObjectPayloadGuard $guard = new VObjectPayloadGuard,
    ) {}

    /**
     * @param  array<string, mixed>  $event
     */
    public function convert(array $event): string
    {
        $calendar = $this->buildCalendar($event);
        $ics = $calendar->serialize();
        $this->guard->assertIcsSize($ics);

        return $ics;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    public function updateVEventInIcs(string $ics, array $event, string $targetUid): string
    {
        $document = $this->guard->readICalendar($ics);

        $replaced = false;
        foreach (CalendarConversionSupport::veventsFromCalendar($document) as $vevent) {
            $uid = isset($vevent->UID) ? trim((string) $vevent->UID->getValue()) : '';
            if ($uid === $targetUid) {
                $document->remove($vevent);
                $replaced = true;
                break;
            }
        }

        if (! $replaced) {
            throw new \InvalidArgumentException('VEVENT with UID '.$targetUid.' not found.');
        }

        $vevent = $document->add('VEVENT', []);
        $event['uid'] = $targetUid;
        $this->populateVEvent($vevent, $event);

        $updated = $document->serialize();
        $this->guard->assertIcsSize($updated);

        return $updated;
    }

    public function removeVEventFromIcs(string $ics, string $targetUid): ?string
    {
        $document = $this->guard->readICalendar($ics);

        $removed = false;
        foreach (CalendarConversionSupport::veventsFromCalendar($document) as $vevent) {
            $uid = isset($vevent->UID) ? trim((string) $vevent->UID->getValue()) : '';
            if ($uid === $targetUid) {
                $document->remove($vevent);
                $removed = true;
                break;
            }
        }

        if (! $removed) {
            throw new \InvalidArgumentException('VEVENT with UID '.$targetUid.' not found.');
        }

        if (CalendarConversionSupport::veventsFromCalendar($document) === []) {
            return null;
        }

        $updated = $document->serialize();
        $this->guard->assertIcsSize($updated);

        return $updated;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function buildCalendar(array $event): VCalendar
    {
        $calendar = new VCalendar([], false);
        $calendar->add('VERSION', '2.0');
        $calendar->add('PRODID', '-//WeGotWorkspace//Calendars REST//EN');
        $this->populateVEvent($calendar->add('VEVENT', []), $event);

        return $calendar;
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
