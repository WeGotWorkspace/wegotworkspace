# iCalendar ↔ JMAP CalendarEvent conversion matrix

## Scope

CalDAV stores one `.ics` blob per `calendarobjects` row. The REST API maps each logical `VEVENT` to one JMAP `CalendarEvent`.

## Multi-VEVENT

| Case | REST `CalendarEvent.id` | CRUD |
|------|-------------------------|------|
| ICS with 1 VEVENT | `{objectUri}` without `.ics` | Full object CRUD |
| ICS with N>1 VEVENT | `{objectUri}#{veventUid}` per component | Read all; PUT/PATCH/DELETE target one VEVENT |
| POST create | `{newObjectUri}` without `.ics` | Always writes single-VEVENT ICS |

**Update/delete on composite id:** only the targeted `VEVENT` is changed; siblings are preserved. Deleting the last `VEVENT` removes the `calendarobjects` row.

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
| ICS → JMAP | Parse RRULE into `RecurrenceRule` objects; **do not** expand instances |
| JMAP → ICS | Serialize `recurrenceRules` to RRULE properties |
| RDATE / RECURRENCE-ID | Not mapped in v1; document if encountered in `icsProps` |

Clients expand recurrence locally for display.

## Non-reversible cases

- Multiple `VEVENT` in one ICS collapsed to composite ids on read — write path always single-VEVENT for POST
- Unknown iCalendar parameters may be dropped unless preserved in `icsProps`
- JMAP `recurrenceOverrides` not supported in v1
