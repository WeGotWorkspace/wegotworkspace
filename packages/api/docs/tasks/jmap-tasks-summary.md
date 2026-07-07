# JMAP Tasks — REST subset summary

> **Issue:** [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)  
> **Architecture:** [docs/architecture/tasks.md](../../../../docs/architecture/tasks.md)

## Scope (v1)

- **Wire protocol:** CalDAV VTODO (RFC 5545) — not JMAP `Task/set` on the wire.
- **REST bodies:** JMAP-shaped `TaskList` and `Task` (draft-ietf-jmap-tasks / RFC 8984 JSCalendar alignment).
- **Capabilities:** `GET /tasks/capabilities` — feature flags + supported subset.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/tasks/capabilities` | Capabilities |
| GET | `/tasks/tasklists` | List task lists |
| GET | `/tasks/tasklists/{taskListId}` | Single task list |
| GET | `/tasks/items?taskListId={id}` | Tasks in list |
| GET | `/tasks/items/{taskId}` | Single task |
| POST | `/tasks/items` | Create task |
| PUT/PATCH | `/tasks/items/{taskId}` | Update task |
| DELETE | `/tasks/items/{taskId}` | Delete task |

Planned incremental sync ([#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158)):

- `GET /tasks/tasklists/changes?since=`
- `GET /tasks/items/changes?taskListId=&since=`

## Non-goals (v1)

- Full JMAP protocol methods (`Task/query`, blob upload, `TaskNotification`)
- Task list REST CRUD (CalDAV-only — [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157))
- Server-side recurrence instance expansion

## Persistence

- Converters: `app/Services/Tasks/Conversion/`
- Persistence: Sabre CalDAV PDO (`calendarobjects`, `calendarinstances`)
- Feature gate: `tasks_enabled` setting (mirror `contacts_enabled`)
- Default task list: VTODO-only CalDAV collection uri `inbox` (display name "Inbox"), provisioned on install and upgrade via `InboxTaskListProvisioner` / `wgw:tasks:provision-inbox`

Conversion detail: [ics-jmap-task-conversion-matrix.md](./ics-jmap-task-conversion-matrix.md) (filled in with #134).
