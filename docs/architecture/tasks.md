# Tasks module architecture

Canonical reference for engineers (human and AI) working on the WeGotWorkspace Tasks product surface, REST API, and CalDAV interop.

**Tracker:** [GitHub #330](https://github.com/WeGotWorkspace/wegotworkspace/issues/330) · **Roadmap:** [v0.9 #313](https://github.com/WeGotWorkspace/wegotworkspace/issues/313)

**API detail (conversion matrices, REST mapping):** [`packages/api/docs/tasks/`](../packages/api/docs/tasks/) — implemented with [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134).

---

## Introduction

WeGotWorkspace assigns each datatype the most suitable **open protocol**, not one uniform format across the suite.

| Domain | Sync protocol | On-disk / wire format | REST shape |
|--------|---------------|----------------------|------------|
| Calendar | CalDAV | VEVENT (RFC 5545) | JMAP-shaped `Calendar` / `CalendarEvent` ([#133](https://github.com/WeGotWorkspace/wegotworkspace/issues/133)) |
| **Tasks** | **CalDAV** | **VTODO (RFC 5545)** | JMAP-shaped `TaskList` / `Task` ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)) |
| Contacts | CardDAV | vCard (+ `vCardProps` passthrough) | JMAP-shaped JSContact ([#131](https://github.com/WeGotWorkspace/wegotworkspace/issues/131)) |
| Notes | WebDAV | YAML-frontmatter Markdown | Custom REST `/notes/*` (VJOURNAL deliberately not used — near-dead client ecosystem) |

**Product (v0.9):** Single **Tasks** app at `/tasks` — unified to-do surface ([#296](https://github.com/WeGotWorkspace/wegotworkspace/issues/296)). Optional “Remind me” alerts ([#299](https://github.com/WeGotWorkspace/wegotworkspace/issues/299)) persist as VTODO VALARM ([#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147)). **No** standalone Reminders app ([#313](https://github.com/WeGotWorkspace/wegotworkspace/issues/313)). In-app alert **delivery** is v1.0 ([#300](https://github.com/WeGotWorkspace/wegotworkspace/issues/300)–[#303](https://github.com/WeGotWorkspace/wegotworkspace/issues/303)).

Persistence reuses the existing Sabre CalDAV PDO backend (`calendars`, `calendarinstances`, `calendarobjects`, `calendarchanges`) — no separate Tasks storage tier.

---

## Decision 1 — Sync protocol: CalDAV VTODO

**Decision:** Tasks sync via **CalDAV VTODO**, not WebDAV/Markdown files.

**Why:** VTODO has a living client ecosystem (Thunderbird Tasks, Tasks.org, OpenTasks, OmniFocus, 2Do, Fantastical, Android/iOS CalDAV clients). Same Sabre server as Calendar — no new infrastructure.

**Sabre / REST implication:**

- Task lists = CalDAV calendar collections whose `supported-calendar-component-set` includes `VTODO`.
- Task items = `calendarobjects` rows containing VTODO components.
- Web client uses JMAP-shaped REST ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)); external clients use CalDAV directly.

---

## Decision 2 — Apple Reminders.app (known asterisk)

**Decision:** Document explicitly that **Apple Reminders.app** does not sync via CalDAV.

**Why:** Since iOS 13 / macOS Catalina, Apple's native Reminders app uses a proprietary silo — not VTODO over CalDAV. This is a product/support expectation, not a bug.

**Implication:** VTODO sync works with third-party CalDAV apps on Apple platforms and all other CalDAV clients. WGW does not target native Reminders.app interop.

---

## Decision 3 — JMAP wire vs JMAP-shaped REST

**Decision:**

- **No JMAP wire sync** for Tasks — RFC JMAP Calendars excludes VTODO/VJOURNAL; there is no standardized `Task/get|set|changes|query` in production JMAP today ([#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158) deferred).
- **Yes JMAP-shaped REST DTOs** — `Task`, `TaskList` request/response bodies with ICS↔JMAP converters ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)), same pattern as Calendar and Contacts.

**Why:** Keeps one REST translation layer for the web app while CalDAV remains the sync source of truth for external clients and future full JMAP Tasks if standardized.

**Implication:** Implement converters under `app/Services/Tasks/Conversion/`; do not build a parallel non-JMAP JSON schema for Tasks.

---

## Decision 4 — Lists and tags

**Decision:**

| Concept | CalDAV / VTODO | WGW app layer |
|---------|----------------|---------------|
| **List** | VTODO-only CalDAV collection (`supported-calendar-component-set: VTODO`) | `TaskList` REST object = `calendarinstances` row |
| **List membership** | Exactly **one** list per task (object lives in one collection) | Move = WebDAV `MOVE` between collections, **preserve `UID`** |
| **Tags** | `CATEGORIES` property on VTODO | Cross-list labels; sidebar filter |
| **Tag taxonomy** | Not a CalDAV concept | Workspace/app table: canonical names, colors, autocomplete ([#149](https://github.com/WeGotWorkspace/wegotworkspace/issues/149) `icsProps` for unknown vendor tags) |

**Why:** Matches Things/Todoist single-list model and RFC 5545 `CATEGORIES` semantics. Tag colors and autocomplete are UX sugar, not interop requirements.

**Sabre implication:** `MKCALENDAR` / `PROPPATCH` for list CRUD via CalDAV until REST collection CRUD ([#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157)). REST v1: list/show only for task lists.

---

## Decision 5 — Projects and shared lists

**Decision:** Projects (color, archive, deadline, members) = **separate CalDAV collections** on a **principal**, with RBAC via `calendarinstances.access` and CalDAV sharing — not a new URL tree.

**Paths:** `calendars/{principal}/{list-uri}/` (e.g. `calendars/users/alice/work/`). **Not** `/workspaces/{id}/tasks/...`.

**Why:** Consistent with existing CalDAV calendar sharing and Shared Drives ACL vocabulary (owner / member). Group principals follow the same pattern when [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157) lands.

**Implication:** Shared group task lists appear in the Lists sidebar section with `myRights` from REST; ACL tests in [#163](https://github.com/WeGotWorkspace/wegotworkspace/issues/163).

---

## Decision 6 — Kanban and STATUS

**Decision:** Kanban columns map **1:1** to VTODO `STATUS`: `NEEDS-ACTION`, `IN-PROCESS`, `COMPLETED`, `CANCELLED`. Extra columns (e.g. “Review”, “Blocked”) require non-interop `X-` extensions.

**Why:** RFC 5545 defines exactly four task states. Custom columns trade UX flexibility for CalDAV client interop.

**REST implication:** JMAP `workflowStatus` ↔ `STATUS` / `PERCENT-COMPLETE` in converter ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)). Kanban is a **main-column view mode** ([#297](https://github.com/WeGotWorkspace/wegotworkspace/issues/297)), not a sidebar section or separate storage model.

---

## Decision 7 — Recurrence (JMAP model)

**Decision:** Master VTODO + `RRULE`; round-trip `recurrenceRules`, `excludedRecurrenceDates`, and `recurrenceOverrides` / RECURRENCE-ID per [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146) — same pattern as Calendar [#139](https://github.com/WeGotWorkspace/wegotworkspace/issues/139).

**Rejected:** In-place master mutation on complete (Tasks.org / Nextcloud style — recompute next `DUE`, reset `STATUS` on same VTODO without overrides).

**Why:** Positions WGW for CalDAV client interop and future JMAP Tasks; clients that write RECURRENCE-ID overrides must not be clobbered.

**Implication:**

- GET list/show returns **master + overrides** — no server-side instance expansion (client expands locally).
- Completing/skipping one occurrence = write a **recurrence override**, not mutate master dates in place.
- Reuse Calendar recurrence conversion helpers where possible.
- v0.9 may ship recurrence UI as **stretch** ([#313](https://github.com/WeGotWorkspace/wegotworkspace/issues/313)); architecture commits to this model regardless.

---

## Decision 8 — VTODO spec gaps

| Gap | Approach | Interop |
|-----|----------|---------|
| No native subtask tree | `RELATED-TO;RELTYPE=PARENT` (flat) | Partial across clients |
| No checklist standard | WGW structured data in `icsProps` or `X-WGW-*` | Non-interop |
| `DUE` xor `DURATION` | One per task, never both | RFC 5545 |

Document in conversion matrix when [#149](https://github.com/WeGotWorkspace/wegotworkspace/issues/149) lands.

---

## Decision 9 — Multi-VTODO `.ics` files

**Decision:** CalDAV may store multiple `VTODO` in one `.ics` (imports). REST maps one `Task` per VTODO.

| Scenario | REST `Task.id` |
|----------|----------------|
| One VTODO per `.ics` (create path) | `calendarobjects.uri` without `.ics` |
| Multiple VTODO in one `.ics` (read) | `{objectUri}#{vtodoUid}` |

**Implication:** Create always writes a single-VTODO object; update/delete targets one component inside a multi-VTODO blob when needed ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)).

---

## Decision 10 — Alerts (VALARM)

**Decision:** Task reminders = **VALARM** on VTODO. v0.9 ships alert **pickers + API persistence** ([#299](https://github.com/WeGotWorkspace/wegotworkspace/issues/299), [#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147)). In-app **delivery** deferred v1.0 ([#300](https://github.com/WeGotWorkspace/wegotworkspace/issues/300)–[#303](https://github.com/WeGotWorkspace/wegotworkspace/issues/303)).

---

## Decision 11 — Collection management (REST v1)

**Decision:** Task list create/rename/delete via **CalDAV** in v1. REST exposes **list/show only** until [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157).

Documented in [`packages/api/docs/contacts/jmap-collection-crud.md`](../packages/api/docs/contacts/jmap-collection-crud.md).

---

## Decision 12–13 — UI shell and sidebar

**Decision:** `tasks-core` uses the **Collection** workspace pattern (`WorkspaceApp` list + detail) — same as Notes/Mail. Reuse `AppSidebar`, `SidebarSection`, `WorkspaceUserFooter` from [notes-core](../../packages/apps/src/notes-core/README.md).

**Sidebar order (top → bottom):**

1. **States** — client-side views (`state:all`, `state:today`, `state:needs-action`, …)
2. **Tags** — cross-list `CATEGORIES` filter (`tag:{name}`); drag-assign like Notes
3. **Lists** — CalDAV `TaskList` scope (`list:{taskListId}`); personal + group-shared when [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157)

**Single active view:** One mutually exclusive `view` key drives the list column (peer to Notes `all` / `nb:` / `tag:`). Combined state+list filters are post-v0.9.

**Kanban:** Optional main-column layout toggle — four columns = four `STATUS` values. Not a fourth sidebar section.

See [#296](https://github.com/WeGotWorkspace/wegotworkspace/issues/296), [#297](https://github.com/WeGotWorkspace/wegotworkspace/issues/297), [workspace-shells.md](../../packages/apps/docs/workspace-shells.md).

---

## Decision 14 — Offline

**Decision:** **Contacts-pattern** Dexie offline — **not** Notes dual-path (Yjs body + Dexie metadata).

**Why:** Tasks are structured entities (title, status, due, tags), not long-form documents. Whole-task CRUD fits the Contacts bootstrap → cache → outbox → reconnect flush model.

**Implementation ([#331](https://github.com/WeGotWorkspace/wegotworkspace/issues/331)):**

- Dexie domain block **40–49** in `offline-version-allocation.ts`
- Files: `tasks-schema.ts`, `tasks-offline-store.ts`, `tasks-outbox-flush.ts`, `tasks-hybrid-operations.ts`
- Incremental sync: `GET /tasks/tasklists/changes`, `GET /tasks/items/changes?taskListId=` when [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158) ships; full bootstrap until then
- Conflicts: ETag / `If-Match` ([#161](https://github.com/WeGotWorkspace/wegotworkspace/issues/161))

Guide: [offline-platform.md](../../packages/apps/docs/offline-platform.md).

Blocked on live [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134) for production outbox flush.

---

## Decision 15 — Collaboration (phased)

| Tier | Scope | Mechanism |
|------|-------|-----------|
| **1 (v0.9)** | Shared group task lists | Sync on reconnect + `/changes` polling + ETag conflict UX — **no Yjs for whole tasks** |
| **2 (optional)** | Rich-text description or live checklist | Yjs/RTC mesh per field room (reuse `docs-collab` stack) — **not** Notes body dual-path for metadata |

**Why tier 1 first:** Multi-user list editing needs eventual consistency and conflict handling, not character-level CRDT on task title/status.

---

## Decision 16 — Branding

**Decision:** Use existing **`tasks.svg`** and teal accent **`#14b8a6`** — **not** `reminders.svg`.

| Surface | Wiring |
|---------|--------|
| Icon | `packages/apps/src/assets/app-icons/tasks.svg` → `/app-icons/tasks.svg` |
| Accent | `WORKSPACE_APP_ACCENT.tasks`, `--tasks-accent` in `tasks-workspace.css` |
| PWA | `public/manifests/tasks.webmanifest`, `workspace-pwa-head.ts` ([#305](https://github.com/WeGotWorkspace/wegotworkspace/issues/305) pattern) |
| Home / switcher | `WORKSPACE_APP_IDS` includes `tasks` |

---

## Property mapping (VTODO ↔ REST Task)

Native fields map to JMAP `Task` / OpenAPI schema. Unmapped VTODO properties round-trip via **`icsProps`** (Calendar pattern, [#149](https://github.com/WeGotWorkspace/wegotworkspace/issues/149)) — not Contacts `vCardProps`.

| VTODO (RFC 5545) | REST / JMAP field | Notes |
|------------------|-------------------|-------|
| `UID` | stable id component | With composite id for multi-VTODO |
| `SUMMARY` | `title` | |
| `DESCRIPTION` | `description` | Plain text v0.9 |
| `DTSTART` | `start` | |
| `DUE` | `due` | Mutually exclusive with `DURATION` |
| `DURATION` | `duration` | Not with `DUE` |
| `COMPLETED` | `completed` | |
| `STATUS` | `workflowStatus` | Four values only |
| `PERCENT-COMPLETE` | (with status) | Converter maps with STATUS |
| `PRIORITY` | `priority` | 0–9 |
| `CATEGORIES` | `categories` | Tags |
| `CLASS` | `privacy` | public/private mapping |
| `RRULE`, `EXDATE`, `RECURRENCE-ID` | `recurrenceRules`, `excludedRecurrenceDates`, `recurrenceOverrides` | [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146) |
| `VALARM` | `alerts` | [#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147) |
| `ORGANIZER`, `ATTENDEE` | participants / assignees | [#148](https://github.com/WeGotWorkspace/wegotworkspace/issues/148) |
| `RELATED-TO;RELTYPE=PARENT` | (app subtask link) | Flat hierarchy |
| `RELATED-TO` (other) | `icsProps` or related field | |
| Unknown / `X-*` | `icsProps` | Round-trip preservation |
| WGW checklist | `icsProps` or `X-WGW-CHECKLIST` | Non-interop |

Full matrix: [`packages/api/docs/tasks/ics-jmap-task-conversion-matrix.md`](../packages/api/docs/tasks/ics-jmap-task-conversion-matrix.md) (with [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)).

---

## CalDAV collection structure

```
/calendars/{username}/           ← calendar-home-set (AppCalendarRoot)
/calendars/{username}/{list-uri}/   ← TaskList (VTODO-only collection)
/calendars/{username}/{list-uri}/{object}.ics   ← VTODO resource(s)
```

- **Principal:** `principals/users/{username}` today; group principals when sharing lands.
- **ACL:** `calendarinstances.access` (1=owner, 2=read, 3=read-write); CalDAV sharing plugin.
- **REST paths (canonical):** `/api/v1/tasks/tasklists`, `/api/v1/tasks/items` ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134) — not `/tasks/tasks`).

**Installer note:** Fresh installs should seed separate VEVENT calendar + VTODO task list ([#332](https://github.com/WeGotWorkspace/wegotworkspace/issues/332)). Legacy mixed default calendar (`VEVENT,VTODO,VJOURNAL`) may exist until migration.

**Synctoken / changes:** Per-collection `calendarchanges` + `synctoken` — same as Calendar ([jmap-sync-rest-mapping.md](../packages/api/docs/contacts/jmap-sync-rest-mapping.md)).

---

## Known limitations

- **Apple Reminders.app** — no native CalDAV sync (Decision 2).
- **Kanban** — four columns max without non-interop `X-` columns (Decision 6).
- **Subtasks / checklists** — partial or non-interop (Decision 8).
- **Mixed default calendar** — until [#332](https://github.com/WeGotWorkspace/wegotworkspace/issues/332) migration.
- **Recurrence UI** — may be v0.9 stretch; storage model still JMAP overrides (Decision 7).
- **Single sidebar view** — no combined state + list filter in v0.9.
- **Tasks offline** — architecture committed ([#331](https://github.com/WeGotWorkspace/wegotworkspace/issues/331)); v0.9 scheduling per [#313](https://github.com/WeGotWorkspace/wegotworkspace/issues/313).
- **Tier-2 Yjs collab** — only if rich description editor ships (Decision 15).

---

## GitHub cross-reference

| Topic | Issue |
|-------|-------|
| Architecture doc (this file) | [#330](https://github.com/WeGotWorkspace/wegotworkspace/issues/330) |
| Tasks REST API | [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134) |
| Recurrence | [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146) |
| VALARM / alerts | [#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147) |
| Assignees | [#148](https://github.com/WeGotWorkspace/wegotworkspace/issues/148) |
| `icsProps` | [#149](https://github.com/WeGotWorkspace/wegotworkspace/issues/149) |
| TZID / all-day | [#150](https://github.com/WeGotWorkspace/wegotworkspace/issues/150) |
| Collection CRUD / sharing | [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157) |
| Incremental sync | [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158) |
| ETag concurrency | [#161](https://github.com/WeGotWorkspace/wegotworkspace/issues/161) |
| tasks-core shell | [#296](https://github.com/WeGotWorkspace/wegotworkspace/issues/296) |
| Task CRUD UI | [#297](https://github.com/WeGotWorkspace/wegotworkspace/issues/297) |
| Storybook | [#298](https://github.com/WeGotWorkspace/wegotworkspace/issues/298) |
| Remind me picker | [#299](https://github.com/WeGotWorkspace/wegotworkspace/issues/299) |
| Offline | [#331](https://github.com/WeGotWorkspace/wegotworkspace/issues/331) |
| Installer calendar split | [#332](https://github.com/WeGotWorkspace/wegotworkspace/issues/332) |
| v0.9 roadmap | [#313](https://github.com/WeGotWorkspace/wegotworkspace/issues/313) |

**Execution order:** Tasks API + app before Calendar ([#313](https://github.com/WeGotWorkspace/wegotworkspace/issues/313) comment 2026-07-06).
