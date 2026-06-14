# JMAP REST API — CalDAV/CardDAV parity gaps

> **Epic:** [GitHub #137](https://github.com/WeGotWorkspace/wegotworkspace/issues/137)  
> **Baseline PRs:** Contacts [#132](https://github.com/WeGotWorkspace/wegotworkspace/pull/132), Calendars [#135](https://github.com/WeGotWorkspace/wegotworkspace/pull/135), Tasks [#136](https://github.com/WeGotWorkspace/wegotworkspace/pull/136)

This document summarizes what the v1 JMAP-shaped REST layers implement versus full CalDAV/CardDAV (and JMAP spec) expectations. Use it for planning; **track work in GitHub issues** linked below.

## Domain summary

| Domain | v1 scope | Biggest gaps | Issues |
|--------|----------|--------------|--------|
| **Contacts** (CardDAV) | JSContact conversion ~90%; REST CRUD | blobId upload, localizations, JSCOMPS, partial matrix | [#151](https://github.com/WeGotWorkspace/wegotworkspace/issues/151)–[#156](https://github.com/WeGotWorkspace/wegotworkspace/issues/156) |
| **Calendars** (VEVENT) | Event CRUD, RRULE read, basic participants | **Alerts**, **recurrenceOverrides**, RRULE write parity, rich locations | [#138](https://github.com/WeGotWorkspace/wegotworkspace/issues/138)–[#145](https://github.com/WeGotWorkspace/wegotworkspace/issues/145) |
| **Tasks** (VTODO) | Title, dates, status, priority | **Recurrence**, **alerts**, participants, `icsProps` | [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146)–[#150](https://github.com/WeGotWorkspace/wegotworkspace/issues/150) |
| **Platform** | List/get + item CRUD | Collection CRUD, sharing, incremental sync | [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157), [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158) |

## Priority

| Priority | Scheduling / interop impact |
|----------|----------------------------|
| **P0** | [#138](https://github.com/WeGotWorkspace/wegotworkspace/issues/138), [#139](https://github.com/WeGotWorkspace/wegotworkspace/issues/139), [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146), [#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147) |
| **P1** | Converter fidelity, OpenAPI alignment ([#140](https://github.com/WeGotWorkspace/wegotworkspace/issues/140)–[#145](https://github.com/WeGotWorkspace/wegotworkspace/issues/145), [#148](https://github.com/WeGotWorkspace/wegotworkspace/issues/148)–[#156](https://github.com/WeGotWorkspace/wegotworkspace/issues/156)) |
| **P2** | Platform features ([#151](https://github.com/WeGotWorkspace/wegotworkspace/issues/151), [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157), [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158)) |

## Calendars (VEVENT)

| Gap | Issue | Docs / converters |
|-----|-------|-------------------|
| VALARM ↔ `alerts` | [#138](https://github.com/WeGotWorkspace/wegotworkspace/issues/138) | `docs/calendars/ics-jmap-conversion-matrix.md`, `Calendars/Conversion/*` |
| `recurrenceOverrides` / RECURRENCE-ID | [#139](https://github.com/WeGotWorkspace/wegotworkspace/issues/139) | same |
| RRULE BY* write (`byYearDay`, `byWeekNo`, `bySetPosition`) | [#140](https://github.com/WeGotWorkspace/wegotworkspace/issues/140) | `CalendarConversionSupport.php` |
| Participant ROLE, CUTYPE, RSVP | [#141](https://github.com/WeGotWorkspace/wegotworkspace/issues/141) | `VEventToJmapEventConverter.php` |
| Locations, links, attachments | [#142](https://github.com/WeGotWorkspace/wegotworkspace/issues/142) | `jmap-calendars-summary.md` |
| VTIMEZONE / `timeZones` | [#143](https://github.com/WeGotWorkspace/wegotworkspace/issues/143) | same |
| RDATE / `excludedRecurrenceRules` | [#144](https://github.com/WeGotWorkspace/wegotworkspace/issues/144) | `ics-jmap-conversion-matrix.md` |
| OpenAPI ↔ runtime drift | [#145](https://github.com/WeGotWorkspace/wegotworkspace/issues/145) | `openapi/schemas/calendars/calendar-event.json` |

## Tasks (VTODO)

| Gap | Issue | Docs / converters |
|-----|-------|-------------------|
| Recurrence | [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146) | `docs/tasks/ics-jmap-task-conversion-matrix.md` |
| VALARM ↔ alerts | [#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147) | `Tasks/Conversion/*` |
| Assignees / participants | [#148](https://github.com/WeGotWorkspace/wegotworkspace/issues/148) | same |
| `icsProps` escape hatch | [#149](https://github.com/WeGotWorkspace/wegotworkspace/issues/149) | parity with calendars |
| TZID / all-day due dates | [#150](https://github.com/WeGotWorkspace/wegotworkspace/issues/150) | `TaskConversionSupport.php` |

## Contacts (CardDAV)

| Gap | Issue | Docs / converters |
|-----|-------|-------------------|
| Media `blobId` + upload | [#151](https://github.com/WeGotWorkspace/wegotworkspace/issues/151) | `rfc9610-summary.md` |
| `localizations` | [#152](https://github.com/WeGotWorkspace/wegotworkspace/issues/152) | `rfc9555-conversion-matrix.md` |
| JSCOMPS ordered components | [#153](https://github.com/WeGotWorkspace/wegotworkspace/issues/153) | same |
| GEO/TZ/ADR grouping | [#154](https://github.com/WeGotWorkspace/wegotworkspace/issues/154) | §2.8.3 |
| Group `members` resolution | [#155](https://github.com/WeGotWorkspace/wegotworkspace/issues/155) | `rfc9610-summary.md` |
| Partial matrix (TEL, titles, anniversaries, …) | [#156](https://github.com/WeGotWorkspace/wegotworkspace/issues/156) | `rfc9555-conversion-matrix.md`, `rfc9982-conversion-matrix.md` |

## Platform

| Gap | Issue |
|-----|-------|
| Address book / calendar / task list CRUD + sharing | [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157) |
| JMAP `changes` / `query` sync | [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158) |

## External interop fixtures

Adopt **Fastmail** (Text::JSCalendar / Text::JSContact normative goldens) and **Audriga** (real-world PHP/Sabre stack exports) as complementary conversion conformance fixtures alongside WGW’s 27 contact golden pairs. Fastmail cases use strict golden match where WGW owns expected JSON; Audriga/cozy cases assert parse + round-trip stability only.

**Tracking:** [#160](https://github.com/WeGotWorkspace/wegotworkspace/issues/160) — feat(api): adopt Fastmail + Audriga conversion interop fixtures (parent epic [#137](https://github.com/WeGotWorkspace/wegotworkspace/issues/137)).

## v1 explicitly implemented (reference)

### Contacts
- vCard ↔ JSContact for core properties (name, email, phone, address, org, notes, media URI, members, online services, crypto keys, calendaring URIs)
- `vCardProps` / `vCardParams` preserve-only properties (e.g. `GENDER`)
- REST: address book list, contact CRUD, CardDAV interop

### Calendars
- Calendar list, event CRUD, multi-VEVENT composite ids
- RRULE / EXDATE read; basic ORGANIZER/ATTENDEE; `icsProps` for unknown VEVENT properties
- Client-side recurrence expansion (no server instance expansion)

### Tasks
- Task list list, task CRUD, multi-VTODO composite ids
- STATUS, PRIORITY, PERCENT-COMPLETE, CLASS, CATEGORIES, DTSTART/DUE/COMPLETED
