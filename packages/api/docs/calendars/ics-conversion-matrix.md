# iCalendar ↔ JMAP CalendarEvent conversion matrix

## Scope

One CalDAV calendar object (`.ics` URI) ↔ one JMAP `CalendarEvent` backed by a single `VEVENT`.

## Multi-VEVENT

| Case | Behavior |
|------|----------|
| ICS with 1 VEVENT | One API event; id = object id (uri without `.ics`) |
| ICS with N>1 VEVENT | N API events; id = `{objectId}#{uid}` per component |
| API create | Always writes 1 VEVENT (new object) |
| API update/delete composite id | Mutates/removes matching VEVENT in shared blob |

## Core fields

| iCalendar | JMAP CalendarEvent |
|-----------|-------------------|
| UID | uid |
| SUMMARY | title |
| DESCRIPTION | description |
| DTSTART | start (+ showWithoutTime, timeZone) |
| DTEND | end |
| DURATION | duration (when no DTEND) |
| RRULE | recurrenceRules[] |
| EXDATE | excludedRecurrenceDates[] |
| LOCATION | locations (single entry) |
| STATUS | status |
| TRANSP | freeBusyStatus |
| CLASS | privacy |
| CATEGORIES | categories |
| ORGANIZER / ATTENDEE | participants |
| CREATED | created |
| LAST-MODIFIED / DTSTAMP | updated |
| SEQUENCE | sequence |
| PRIORITY | priority |
| Unknown VEVENT props | icsProps |

## Recurrence

| Direction | Rule |
|-----------|------|
| ICS → JMAP | Parse RRULE into `RecurrenceRule` objects; do not expand |
| JMAP → ICS | Serialize `recurrenceRules` to RRULE properties |

Clients are responsible for expanding recurrence to display instances.
