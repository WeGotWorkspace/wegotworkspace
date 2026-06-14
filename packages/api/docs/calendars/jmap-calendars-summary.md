# JMAP Calendars field subset (REST API)

This API exposes a **subset** of the [JMAP Calendars draft](https://jmap.io/spec.html) types over REST. Full JMAP protocol methods (`CalendarEvent/set`, `/changes`, `/query`) are out of scope.

## Calendar

Returned by `GET /calendars/calendars` and `GET /calendars/calendars/{calendarId}`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `calendarinstances.uri` for the authenticated principal |
| `name` | string | `{DAV:}displayname` or uri fallback |
| `description` | string \| null | Instance description |
| `timeZone` | string \| null | VTIMEZONE or TZID reference when set |
| `color` | string \| null | `calendarcolor` |
| `sortOrder` | integer | `calendarorder` |
| `isDefault` | boolean | `true` when uri is `default` |
| `isSubscribed` | boolean | Always `true` for owned instances in v1 |
| `shareWith` | null | JMAP Sharing deferred |
| `myRights` | object | Static rights derived from CalDAV `access` |

## CalendarEvent

Returned by event endpoints. `@type` is always `"Event"`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Object uri without `.ics`, or `{objectUri}#{veventUid}` for multi-VEVENT ICS |
| `uid` | string | VEVENT UID |
| `calendarIds` | map | Enabled calendar uri → `true` |
| `title` | string | SUMMARY |
| `description` | string | DESCRIPTION |
| `start` / `end` | string | ISO 8601 or date for all-day |
| `duration` | string | iCalendar DURATION when no DTEND |
| `showWithoutTime` | boolean | All-day events |
| `timeZone` | string | TZID when floating/local |
| `recurrenceRules` | array | Master RRULE — **not** expanded instances |
| `excludedRecurrenceDates` | array | EXDATE values |
| `recurrenceOverrides` | map | RECURRENCE-ID override VEVENTs keyed by instance start |
| `locations` | map | LOCATION → `Location` |
| `participants` | map | ORGANIZER / ATTENDEE |
| `status` | string | `confirmed` \| `cancelled` \| `tentative` |
| `freeBusyStatus` | string | TRANSP mapping |
| `privacy` | string | CLASS mapping |
| `categories` | array | CATEGORIES |
| `created` / `updated` | string | CREATED / LAST-MODIFIED |
| `sequence` / `priority` | integer | SEQUENCE / PRIORITY |
| `icsProps` | object | Unmapped VEVENT properties preserved round-trip |

## Non-goals (v1)

- Server-side recurrence instance expansion
- `VTODO`, `VJOURNAL`, scheduling inbox REST
- Calendar CRUD (create/rename/delete calendars)
- JMAP Sharing (`shareWith` always `null`)
