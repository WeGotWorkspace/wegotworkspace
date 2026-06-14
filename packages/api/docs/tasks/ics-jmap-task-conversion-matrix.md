# VTODO ↔ JMAP Task conversion matrix

## Identity

| Direction | Rule |
|-----------|------|
| TaskList.id | `calendarinstances.uri` where parent calendar `components` includes `VTODO` |
| Task.id (single VTODO) | `calendarobjects.uri` without `.ics` suffix |
| Task.id (multi-VTODO) | `{objectUriWithoutSuffix}#{vtodoUid}` |
| Task.uid | VTODO `UID` property |

## Property mapping

| VTODO (RFC 5545) | JMAP Task |
|------------------|-----------|
| `SUMMARY` | `title` |
| `DESCRIPTION` | `description` |
| `DTSTART` | `start` (LocalDateTime) |
| `DUE` | `due` (LocalDateTime) |
| `DTSTART`/`DUE;VALUE=DATE` | `showWithoutTime: true` + date-only value |
| `DTSTART`/`DUE;TZID=` | `timeZone` |
| `COMPLETED` | `completed` (UTCDateTime, always `Z` suffix) |
| `STATUS: NEEDS-ACTION` | `workflowStatus: needs-action` |
| `STATUS: IN-PROCESS` | `workflowStatus: in-process` |
| `STATUS: COMPLETED` | `workflowStatus: completed` |
| `STATUS: CANCELLED` | `workflowStatus: cancelled` |
| `PERCENT-COMPLETE` | `progress` (0–100) |
| `PRIORITY` (1=highest…9=lowest) | `priority` (1=highest…10=lowest): `10 - ical + 1` |
| `CATEGORIES` | `categories[]` |
| `CLASS: PUBLIC` | `privacy: public` |
| `CLASS: PRIVATE` | `privacy: private` |
| `CLASS: CONFIDENTIAL` | `privacy: secret` |
| `RRULE` | `recurrenceRules[]` |
| `EXDATE` | `excludedRecurrenceDates[]` |
| `RECURRENCE-ID` override VTODO | `recurrenceOverrides[recurrenceId]` |
| `VALARM` | `alerts` (IdMap) |
| `ORGANIZER` / `ATTENDEE` | `participants` (IdMap) |
| Unmapped VTODO properties | `icsProps` map |

## Date/time semantics

| Direction | Rule |
|-----------|------|
| ICS → JMAP | `VALUE=DATE` on `DTSTART`/`DUE` sets `showWithoutTime: true` and date-only JMAP value |
| ICS → JMAP | `TZID` parameter captured in `timeZone` |
| JMAP → ICS | `showWithoutTime: true` emits `VALUE=DATE` (`YYYYMMDD`) |
| JMAP → ICS | `timeZone` written as `TZID` on floating date-times |
| `COMPLETED` | Always normalized to UTC with `Z` suffix on read and write |

## Participants

| Direction | Rule |
|-----------|------|
| ICS → JMAP | `ORGANIZER` → `participants.org` with `roles: [owner]` |
| ICS → JMAP | Each `ATTENDEE` → `participants.attN` with `roles: [attendee]` |
| ICS → JMAP | `PARTSTAT` → `participationStatus` (lowercase) |
| JMAP → ICS | `roles` containing `owner` writes `ORGANIZER`; others write `ATTENDEE` |

## icsProps escape hatch

| Direction | Rule |
|-----------|------|
| ICS → JMAP | Any VTODO property not in the known mapped set → `icsProps[name]` |
| JMAP → ICS | Each `icsProps` entry merged into VTODO on upsert |
| Known (excluded) | `UID`, `SUMMARY`, `DESCRIPTION`, `DTSTART`, `DUE`, `COMPLETED`, `STATUS`, `PERCENT-COMPLETE`, `PRIORITY`, `CATEGORIES`, `CLASS`, `CREATED`, `LAST-MODIFIED`, `RRULE`, `EXDATE`, `RECURRENCE-ID`, `ORGANIZER`, `ATTENDEE`, `DTSTAMP`, `SEQUENCE` |

## Recurrence

| Direction | Rule |
|-----------|------|
| ICS → JMAP | Parse RRULE into `RecurrenceRule` objects; group VTODO components sharing a `UID` into one Task |
| ICS → JMAP overrides | VTODO with `RECURRENCE-ID` become `recurrenceOverrides` patches; `STATUS:CANCELLED` → `excluded: true` |
| JMAP → ICS | Serialize `recurrenceRules` to RRULE; `excludedRecurrenceDates` and `recurrenceOverrides.excluded` → EXDATE |
| JMAP → ICS overrides | Each non-excluded `recurrenceOverrides` entry writes a sibling VTODO with `RECURRENCE-ID` |
| Instance expansion | **Client responsibility** — server stores RRULE only, consistent with JMAP Tasks draft |

## Alerts

| Direction | Rule |
|-----------|------|
| ICS → JMAP | Each `VALARM` under VTODO → `alerts` entry with `OffsetTrigger` or `AbsoluteTrigger` |
| Offset trigger | `TRIGGER` duration; `RELATED=END` → `relativeTo: end` (due), default → `relativeTo: start` |
| JMAP → ICS | Each alert writes a `VALARM` sub-component under the master VTODO |

## Write semantics

- **Create:** always writes a single-VTODO `.ics` object via CalPDO `createCalendarObject` (plus override VTODOs when `recurrenceOverrides` present).
- **Update/PATCH:** replaces all VTODO components with matching `UID`; preserves unrelated VTODO in multi-UID blobs.
- **Delete:** removes all VTODO with matching `UID`, or deletes the object when empty.

## Deferred

- `VTIMEZONE` component definitions
- JMAP extensions: multilingual titles
