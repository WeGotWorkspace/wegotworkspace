# JMAP collection CRUD and sharing — REST status

> **Issue:** [#157](https://github.com/WeGotWorkspace/wegotworkspace/issues/157)

## Implemented (contacts)

| Operation | REST | Backend |
|-----------|------|---------|
| List | `GET /contacts/addressbooks` | `addressbooks` table |
| Show | `GET /contacts/addressbooks/{id}` | same |
| Create | `POST /contacts/addressbooks` | Sabre `CardPDO::createAddressBook` |
| Update | `PATCH /contacts/addressbooks/{id}` | Sabre `updateAddressBook` (name, description) |
| Delete | `DELETE /contacts/addressbooks/{id}` | Sabre `deleteAddressBook`; `onDestroyRemoveContents` mirrors JMAP `AddressBook/set` |

**Constraints:**

- `default` book cannot be deleted (`403 forbidden`).
- Non-empty books require `{ "onDestroyRemoveContents": true }` or return `409 addressBookHasContents`.
- Book `id` is the immutable CalDAV uri slug (`[a-z0-9_-]+`).

## Deferred — calendars and task lists (CalDAV-only management)

Calendar and task list **collections** remain **read-only over REST** in v1. Create/rename/delete/subscribe continues via **CalDAV** (`MKCALENDAR`, `PROPPATCH`, `DELETE` on `/calendars/{user}/{calendar}/`).

| Collection | REST v1 | CalDAV |
|------------|---------|--------|
| Calendar (VEVENT) | List/show only | Full collection CRUD |
| Task list (VTODO calendar) | List/show only | Same CalDAV calendar tree |

Rationale: Sabre CalDAV calendar creation ties together `calendars` + `calendarinstances` rows, component sets (`VEVENT` vs `VTODO`), and default color/timezone props. REST CRUD will reuse the same PDO backend in a follow-up; documenting CalDAV-only avoids divergent behavior.

## Sharing (RFC 9670) — stub

| Field | v1 behavior | Plan |
|-------|-------------|------|
| `shareWith` | Always `null` on responses; **rejected** on PATCH (`422`) | Persist in `calendarinstances` share tables / CardDAV sharing plugin when RFC 9670 lands |
| `myRights` | Derived from ownership: owned books/lists get read/write; `mayDelete` true for non-default owned address books; calendars use CalDAV `access` (1=owner, 2=read, 3=read-write) |

**RFC 9670 implementation plan (outline):**

1. Add shared-collection tables / Sabre plugins already used by CardDAV/CalDAV sharing.
2. Extend list/show to populate `shareWith` for owners with `mayShare`.
3. Accept `shareWith` on PATCH with `forbidden` when granting rights the owner lacks.
4. ACL tests in [#163](https://github.com/WeGotWorkspace/wegotworkspace/issues/163).

## Related docs

- [jmap-sync-rest-mapping.md](./jmap-sync-rest-mapping.md) — incremental sync ([#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158))
- [rfc9610-summary.md](./rfc9610-summary.md) — contacts field mapping
- [jmap-calendars-summary.md](../calendars/jmap-calendars-summary.md) — calendar non-goals
