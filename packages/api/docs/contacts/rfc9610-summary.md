# RFC 9610 — JMAP Contacts (Reference Summary)

> **Source:** [RFC 9610](https://www.rfc-editor.org/rfc/rfc9610) (December 2024)  
> **Related:** [RFC 8620](https://www.rfc-editor.org/rfc/rfc8620) (JMAP core), [RFC 9553](https://www.rfc-editor.org/rfc/rfc9553) (JSContact Card), [RFC 9670](https://www.rfc-editor.org/rfc/rfc9670) (JMAP Sharing)

This document distills RFC 9610 for implementers of the WeGotWorkspace contacts REST API. A `ContactCard` is a JSContact `Card` (RFC 9553 §2) plus JMAP-specific properties.

---

## Data model overview

```
Account (JMAP)
 └── AddressBook[]          — named collections
      └── ContactCard[]     — JSContact Card + JMAP fields
```

- Every `ContactCard` belongs to **at least one** `AddressBook` at all times.
- A card may belong to **multiple** address books (membership is a set).
- `ContactCard` body = full JSContact `Card` object + `id` + `addressBookIds` (+ `blobId` on `Media`).
- Group cards: `kind: "group"` with optional `members` map (member uids).

---

## Capability: `urn:ietf:params:jmap:contacts`

**Session `capabilities`:** empty object `{}`.

**Account `accountCapabilities`:**

| Property | Type | Description |
|----------|------|-------------|
| `maxAddressBooksPerCard` | `UnsignedInt \| null` | Max books per card (≥1), or `null` = no limit |
| `mayCreateAddressBook` | `Boolean` | Whether user may create address books |

---

## AddressBook

| Property | Type | Attributes | Description |
|----------|------|------------|-------------|
| `id` | `Id` | immutable, server-set | Address book identifier |
| `name` | `String` | required | User-visible name; non-empty, ≤255 UTF-8 octets |
| `description` | `String \| null` | default: `null` | Long-form description for shared contexts |
| `sortOrder` | `UnsignedInt` | default: `0` | UI sort order; `0 ≤ sortOrder < 2^31`; lower = first; ties → alphabetical by `name` |
| `isDefault` | `Boolean` | server-set | Exactly one book per account SHOULD be default; MUST NOT be >1 |
| `isSubscribed` | `Boolean` | | `true` = show in client UI; shared books SHOULD default `false` |
| `shareWith` | `Id[AddressBookRights] \| null` | default: `null` | Principal id → rights; `null` if not shared or no RFC 9670 support |
| `myRights` | `AddressBookRights` | server-set | Current user's access rights |

### AddressBookRights

| Property | Type | Description |
|----------|------|-------------|
| `mayRead` | `Boolean` | Fetch cards in this book |
| `mayWrite` | `Boolean` | Create/update/delete/move cards |
| `mayShare` | `Boolean` | Modify `shareWith` |
| `mayDelete` | `Boolean` | Delete the address book itself |

### AddressBook API methods

| Method | JMAP path | Notes |
|--------|-----------|-------|
| `AddressBook/get` | Standard `/get` (RFC 8620 §5.1) | `ids` may be `null` to fetch all |
| `AddressBook/changes` | Standard `/changes` (§5.2) | Incremental sync |
| `AddressBook/set` | Standard `/set` (§5.3) | Extra args below |

**`AddressBook/set` extra arguments:**

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `onDestroyRemoveContents` | `Boolean` | `false` | If `false`, destroy rejected when book has cards (`addressBookHasContents` error). If `true`, cards removed; orphaned cards destroyed |
| `onSuccessSetIsDefault` | `Id \| null` | | On full success, set this book as default (supports creation refs `#…`) |

**`AddressBook/set` constraints:**
- `shareWith`: only if `mayShare`; cannot grant rights user doesn't have → `forbidden` SetError
- `isSubscribed`: server MAY forbid subscription → `forbidden`

**SetError:** `addressBookHasContents` — destroy attempted with cards present and `onDestroyRemoveContents: false`.

---

## ContactCard

Extends JSContact `Card` (RFC 9553 §2) with:

| Property | Type | Attributes | Context | Description |
|----------|------|------------|---------|-------------|
| `id` | `Id` | immutable, server-set | Card | Server card id; MAY differ from `uid`; unique `uid` per account |
| `addressBookIds` | `Id[Boolean]` | required | Card | Set of address book ids; each value MUST be `true`; ≥1 book always |
| `blobId` | `Id` | | Media | JMAP blob id for binary media (replaces `data:` URI on read) |

### Media / blob handling

- On **read**: `Media` with `data:` URI SHOULD return `blobId` + `mediaType`, omit `uri`.
- On **write**: client MAY send `blobId` instead of `uri`.
- Photo upload: use JMAP blob upload (RFC 8620 §6.1); server MUST reject non-image types for photos.

### Group cards

- `kind: "group"` — clients often present separately.
- `members`: map of member `uid` → `true`.
- Resolve members across all accessible accounts with `urn:ietf:params:jmap:contacts`.
- Unresolvable uids: ignore but preserve.

### ContactCard API methods

| Method | JMAP path | Notes |
|--------|-----------|-------|
| `ContactCard/get` | Standard `/get` | |
| `ContactCard/changes` | Standard `/changes` | |
| `ContactCard/query` | Standard `/query` | Filter + sort below |
| `ContactCard/queryChanges` | Standard `/queryChanges` | |
| `ContactCard/set` | Standard `/set` | Blob upload for photos |
| `ContactCard/copy` | Standard `/copy` | |

---

## ContactCard/query — FilterCondition

All properties optional; **AND** semantics when multiple set. Empty object → always true.

| Property | Type | Match rule |
|----------|------|------------|
| `inAddressBook` | `Id` | Card in this address book |
| `uid` | `String` | Exact `uid` match |
| `hasMember` | `String` | `members` contains this uid |
| `kind` | `String` | Exact `kind` match |
| `createdBefore` | `UTCDate` | `created` before datetime |
| `createdAfter` | `UTCDate` | `created` ≥ datetime |
| `updatedBefore` | `UTCDate` | `updated` before datetime |
| `updatedAfter` | `UTCDate` | `updated` ≥ datetime |
| `text` | `String` | Matches text anywhere in card |
| `name` | `String` | Any `NameComponent.value` or `name.full` |
| `name/given` | `String` | `NameComponent` with `kind: "given"` |
| `name/surname` | `String` | `NameComponent` with `kind: "surname"` |
| `name/surname2` | `String` | `NameComponent` with `kind: "surname2"` |
| `nickname` | `String` | Any `Nickname.name` |
| `organization` | `String` | Any `Organization.name` |
| `email` | `String` | Any `EmailAddress.address` or `.label` |
| `phone` | `String` | Any `Phone.number` or `.label` |
| `onlineService` | `String` | Any `OnlineService.service`, `.uri`, `.user`, or `.label` |
| `address` | `String` | Any `AddressComponent.value` or `Address.full` |
| `note` | `String` | Any `Note.note` |

**String matching semantics** (deliberately flexible):
- Case-insensitive
- Quoted strings → phrase search (`\"`, `\'`, `\\` escapes)
- Whitespace → separate tokens (all required)
- MAY use stemming (e.g. `bus` → `buses`)

### ContactCard/query — Sorting

**MUST support:**

| `property` | Sort key |
|------------|----------|
| `created` | Card `created` |
| `updated` | Card `updated` |

**SHOULD support:**

| `property` | Sort key |
|------------|----------|
| `name/given` | First `NameComponent` with `kind: "given"` |
| `name/surname` | First `NameComponent` with `kind: "surname"` |
| `name/surname2` | First `NameComponent` with `kind: "surname2"` |

---

## JMAP-reserved JSContact properties (IANA)

RFC 9610 registers these as **reserved** in the JSContact Properties registry (not used in plain JSContact; JMAP-only):

| Property | Context | Usage |
|----------|---------|-------|
| `id` | Card | Reserved — JMAP `ContactCard.id` |
| `addressBookIds` | Card | Reserved — JMAP membership |
| `blobId` | Media | Reserved — JMAP blob reference |

---

## REST mapping notes (WeGotWorkspace)

This plan exposes a subset of JMAP via REST; mapping to Sabre CardDAV:

| JMAP field | Persistence source |
|------------|-------------------|
| `AddressBook.id` | `addressbooks.uri` |
| `AddressBook.name` | `addressbooks.displayname` |
| `AddressBook.description` | `addressbooks.description` |
| `AddressBook.isDefault` | `uri === 'default'` |
| `AddressBook.isSubscribed` | always `true` (owned books) |
| `AddressBook.shareWith` | `null` (deferred — see `jmap-collection-crud.md`) |
| `AddressBook.myRights` | ownership-derived; `mayDelete` true for non-default owned books |
| `ContactCard.id` | card `uri` without `.vcf` |
| `ContactCard.addressBookIds` | `{ [book.uri]: true }` |
| JSContact `uid` | vCard `UID` |
| `created` / `updated` | `lastmodified` + vCard metadata |

**Deferred from full JMAP:** `/queryChanges`, `/copy`, blob upload API, sharing (RFC 9670), advanced query filters (`text`, `name`, …).

**Implemented (platform #157 / #158):** address book CRUD — see `jmap-collection-crud.md`; contacts `/changes` + `/query` (uid + inAddressBook) — see `jmap-sync-rest-mapping.md`.

---

## Security & internationalization (summary)

- Contacts are PII; enforce ACLs per address book.
- Servers MAY restrict Unicode in free-form strings (e.g. PRECIS FreeformClass).
- Forbidden code points: strip/replace with U+FFFD or reject with `invalidProperties` SetError.

---

## References

- [RFC 9610](https://www.rfc-editor.org/info/rfc9610) — JMAP Contacts
- [RFC 9553](https://www.rfc-editor.org/info/rfc9553) — JSContact type definitions → see `rfc9553-jscontact-types.md`
- [RFC 9555](https://www.rfc-editor.org/info/rfc9555) — vCard conversion (base spec) → see `rfc9555-conversion-matrix.md`
- [RFC 9982](https://www.rfc-editor.org/info/rfc9982) — JSContact 2.0; updates RFC 9555 `uid` rules → see `rfc9982-conversion-matrix.md`
