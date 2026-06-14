# RFC 9553 — JSContact Type Inventory

> **Source:** [RFC 9553](https://www.rfc-editor.org/rfc/rfc9553) (May 2024, version 1.0)  
> **Media type:** `application/jscontact+json` (optional `version` parameter)

Complete inventory of IANA-registered JSContact types and properties for implementers. Primitive JSON types (`String`, `Number`, `Boolean`) and common scalars are listed first; then all object types with full property signatures.

**Counts:** 28 RFC 9553 object types + 8 primitive/registry types + 1 reserved base (`Resource`) + 1 conversion type (`JCardProp`, RFC 9555) = **38 IANA type names**; **67 unique property names** in the JSContact Properties registry (Table 2), **~95 property-in-context definitions** including `Resource` descendants and RFC 9555 extensions.

---

## Primitive & common scalar types

| Type | Signature | Constraints |
|------|-----------|-------------|
| `String` | JSON string | Case-sensitive unless noted |
| `Number` | JSON number | |
| `Boolean` | JSON boolean | |
| `Id` | `String` | 1–255 octets; `[A-Za-z0-9_-]` only (base64url alphabet minus `=`) |
| `Int` | `Number` | `-2^53+1 … 2^53-1` |
| `UnsignedInt` | `Number` | `0 … 2^53-1` |
| `UTCDateTime` | `String` | RFC 3339 `date-time`; uppercase; `Z` offset; no trailing zero fractional seconds |

### Map conventions

- `Id[T]` — unordered set keyed by `Id`; keys preserved across versions
- `String[Boolean]` — set; values MUST be `true`
- `String[T]` — map with string keys
- `A[]` — JSON array of `A`
- `A\|B` — union; optional `defaultType: A` attribute

### PatchObject (`String[*]`)

JSON Pointer patches (subset of RFC 6901). Rules:
- No `-` array index; no `null` at array index terminus
- Parent paths must exist; no prefix conflicts between patches
- `null` value → remove optional property
- Invalid patch set → reject entire PatchObject

---

## Shared properties (Section 1.5)

Usable only where explicitly allowed on a type.

| Property | Type | Description |
|----------|------|-------------|
| `contexts` | `String[Boolean]` | Usage context; common: `private`, `work`; Address also: `billing`, `delivery` |
| `label` | `String` | Custom display label |
| `pref` | `UnsignedInt` | Preference 1–100 (1 = most preferred); independent per contact-info type |
| `phonetic` | `String` | Phonetic representation (on `NameComponent` / `AddressComponent`) |
| `phoneticScript` | `String` | Script subtag (RFC 5646) for phonetic values |
| `phoneticSystem` | `String` | `ipa`, `jyut`, `piny` |

### Resource base (Section 1.4.4) — reserved type name

Not used as `@type` value; concrete resource types extend it:

| Property | Type | Attributes |
|----------|------|------------|
| `@type` | `String` | MUST be concrete type name, not `"Resource"` |
| `kind` | `String` | optional (mandatory on some subtypes) |
| `uri` | `String` | **mandatory** — RFC 3986 URI |
| `mediaType` | `String` | optional |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |
| `label` | `String` | optional |

---

## Card (top-level contact object)

**Media type context.** `@type` MUST be `"Card"` on standalone instances.

### Metadata (§2.1)

| Property | Type | Attr | Description |
|----------|------|------|-------------|
| `@type` | `String` | mandatory | MUST be `"Card"` |
| `version` | `String` | mandatory | JSContact version; initial: `"1.0"` |
| `created` | `UTCDateTime` | optional | Creation timestamp |
| `kind` | `String` | optional, default: `"individual"` | `individual`, `group`, `org`, `location`, `device`, `application` (+ vendor) |
| `language` | `String` | optional | Primary language tag (RFC 5646) |
| `members` | `String[Boolean]` | optional | Group member uids; requires `kind: "group"` if set |
| `prodId` | `String` | optional | Product identifier (≥1 char) |
| `relatedTo` | `String[Relation]` | optional | Related card uids → relation types |
| `uid` | `String` | **mandatory** in v1.0; **optional** in v2.0 ([RFC 9982](https://www.rfc-editor.org/info/rfc9982)) | Cross-system identifier; SHOULD be UUID URN |
| `updated` | `UTCDateTime` | optional | Last modification |

### Name & organization (§2.2)

| Property | Type | Description |
|----------|------|-------------|
| `name` | `Name` | Entity name |
| `nicknames` | `Id[Nickname]` | Nicknames |
| `organizations` | `Id[Organization]` | Organizations & units |
| `speakToAs` | `SpeakToAs` | Grammatical gender & pronouns |
| `titles` | `Id[Title]` | Job titles / roles |

### Contact channels (§2.3)

| Property | Type | Description |
|----------|------|-------------|
| `emails` | `Id[EmailAddress]` | Email addresses |
| `onlineServices` | `Id[OnlineService]` | IM, social, etc. |
| `phones` | `Id[Phone]` | Phone numbers |
| `preferredLanguages` | `Id[LanguagePref]` | Preferred contact languages |

### Calendaring (§2.4)

| Property | Type | Description |
|----------|------|-------------|
| `calendars` | `Id[Calendar]` | Calendar / free-busy resources |
| `schedulingAddresses` | `Id[SchedulingAddress]` | Calendar scheduling URIs |

### Addresses (§2.5)

| Property | Type | Description |
|----------|------|-------------|
| `addresses` | `Id[Address]` | Postal / geographic addresses |

### Resources (§2.6)

| Property | Type | Description |
|----------|------|-------------|
| `cryptoKeys` | `Id[CryptoKey]` | Public keys / certificates |
| `directories` | `Id[Directory]` | Directory entries / services |
| `links` | `Id[Link]` | General URIs |
| `media` | `Id[Media]` | Photos, logos, sounds |

### Multilingual (§2.7)

| Property | Type | Description |
|----------|------|-------------|
| `localizations` | `String[PatchObject]` | Per-language patches (keys = language tags) |

### Additional (§2.8)

| Property | Type | Description |
|----------|------|-------------|
| `anniversaries` | `Id[Anniversary]` | Birth, death, wedding dates |
| `keywords` | `String[Boolean]` | Tags / categories |
| `notes` | `Id[Note]` | Free-text notes |
| `personalInfo` | `Id[PersonalInfo]` | Expertise, hobbies, interests |

### JMAP extensions (RFC 9610 — reserved in plain JSContact)

| Property | Type | Context | Description |
|----------|------|---------|-------------|
| `id` | — | Card | JMAP server id (reserved) |
| `addressBookIds` | — | Card | JMAP address book membership (reserved) |
| `blobId` | — | Media | JMAP blob reference (reserved) |

### Conversion extensions (RFC 9555)

| Property | Type | Context | Description |
|----------|------|---------|-------------|
| `vCardProps` | `JCardProp[]` | Card | Unmapped vCard properties (jCard tuple) |
| `vCardParams` | `String[String\|String[]]` | Any object | Preserved vCard parameters |
| `vCardName` | `String` | Any object | Source vCard property name |

---

## Nested object types

### Name (§2.2.1.1)

At least one of `components` or `full` MUST be set.

| Property | Type | Attr | Description |
|----------|------|------|-------------|
| `@type` | `String` | | `"Name"` |
| `components` | `NameComponent[]` | optional | Name parts; ≥1 non-separator |
| `isOrdered` | `Boolean` | optional, default: `false` | Components form display order |
| `defaultSeparator` | `String` | optional | Default join separator (if ordered) |
| `full` | `String` | optional | Full name string |
| `sortAs` | `String[String]` | optional | Per-component-type sort strings |
| `phoneticScript` | `String` | optional | Script for phonetic components |
| `phoneticSystem` | `String` | optional | `ipa`, `jyut`, `piny` |

### NameComponent (§2.2.1.2)

| Property | Type | Attr | Description |
|----------|------|------|-------------|
| `@type` | `String` | | `"NameComponent"` |
| `value` | `String` | **mandatory** | Component text |
| `kind` | `String` | **mandatory** | See enum below |
| `phonetic` | `String` | optional | Pronunciation |

**`kind` values:** `title`, `given`, `given2`, `surname`, `surname2`, `credential`, `generation`, `separator`

### Nickname (§2.2.2)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `name` | `String` | **mandatory** |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |

### Organization (§2.2.3)

At least one of `name` or `units` MUST be set.

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `name` | `String` | optional |
| `units` | `OrgUnit[]` | optional (≥1 if set) |
| `sortAs` | `String` | optional |
| `contexts` | `String[Boolean]` | optional |

### OrgUnit (§2.2.3)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `name` | `String` | **mandatory** |
| `sortAs` | `String` | optional |

### SpeakToAs (§2.2.4)

At least one of `grammaticalGender` or `pronouns` MUST be set.

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `grammaticalGender` | `String` | optional — `animate`, `common`, `feminine`, `inanimate`, `masculine`, `neuter` |
| `pronouns` | `Id[Pronouns]` | optional |

### Pronouns (§2.2.4)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `pronouns` | `String` | **mandatory** |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |

### Title (§2.2.5)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `name` | `String` | **mandatory** |
| `kind` | `String` | optional, default: `"title"` — `title`, `role` |
| `organizationId` | `Id` | optional — references `organizations` key |

### EmailAddress (§2.3.1)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `address` | `String` | **mandatory** — RFC 5322 addr-spec |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |
| `label` | `String` | optional |

### OnlineService (§2.3.2)

At least one of `uri` or `user` MUST be set.

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `service` | `String` | optional — e.g. `Mastodon`, `GitHub` |
| `uri` | `String` | optional — RFC 3986 URI |
| `user` | `String` | optional — handle/username |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |
| `label` | `String` | optional |

### Phone (§2.3.3)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `number` | `String` | **mandatory** — `tel:`, `sip:`, or free text |
| `features` | `String[Boolean]` | optional — see enum |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |
| `label` | `String` | optional |

**`features` values:** `mobile`, `voice`, `text`, `video`, `main-number`, `textphone`, `fax`, `pager`

### LanguagePref (§2.3.4)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `language` | `String` | **mandatory** — RFC 5646 tag |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |

### Calendar (§2.4.1) — extends Resource

| Property | Type | Attr |
|----------|------|------|
| *(Resource)* | | `uri` mandatory |
| `kind` | `String` | **mandatory** — `calendar`, `freeBusy` |

### SchedulingAddress (§2.4.2)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `uri` | `String` | **mandatory** |
| `contexts` | `String[Boolean]` | optional |
| `pref` | `UnsignedInt` | optional |
| `label` | `String` | optional |

### Address (§2.5.1.1)

At least one of `components`, `coordinates`, `countryCode`, `full`, `timeZone` MUST be set.

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `components` | `AddressComponent[]` | optional |
| `isOrdered` | `Boolean` | optional, default: `false` |
| `countryCode` | `String` | optional — ISO 3166-1 alpha-2 |
| `coordinates` | `String` | optional — `geo:` URI (RFC 5870) |
| `timeZone` | `String` | optional — IANA TZ name |
| `contexts` | `String[Boolean]` | optional — + `billing`, `delivery` |
| `full` | `String` | optional |
| `defaultSeparator` | `String` | optional |
| `pref` | `UnsignedInt` | optional |
| `phoneticScript` | `String` | optional |
| `phoneticSystem` | `String` | optional |

### AddressComponent (§2.5.1.2)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `value` | `String` | **mandatory** |
| `kind` | `String` | **mandatory** — see enum |
| `phonetic` | `String` | optional |

**`kind` values:** `room`, `apartment`, `floor`, `building`, `number`, `name`, `block`, `subdistrict`, `district`, `locality`, `region`, `postcode`, `country`, `direction`, `landmark`, `postOfficeBox`, `separator`

### CryptoKey (§2.6.1) — extends Resource

| Property | Notes |
|----------|-------|
| `@type` | MUST be `"CryptoKey"` |
| *(all Resource properties)* | `uri` mandatory |

### Directory (§2.6.2) — extends Resource

| Property | Type | Attr |
|----------|------|------|
| `kind` | `String` | **mandatory** — `directory`, `entry` |
| `listAs` | `UnsignedInt` | optional — position in list (same `kind`) |

### Link (§2.6.3) — extends Resource

| Property | Type | Attr |
|----------|------|------|
| `kind` | `String` | optional — `contact` |

### Media (§2.6.4) — extends Resource

| Property | Type | Attr |
|----------|------|------|
| `kind` | `String` | **mandatory** — `photo`, `sound`, `logo` |
| `blobId` | `Id` | JMAP only (RFC 9610, reserved) |

### Relation (§2.1.8)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `relation` | `String[Boolean]` | optional, default: `{}` |

**`relation` values:** `acquaintance`, `agent`, `child`, `co-resident`, `co-worker`, `colleague`, `contact`, `crush`, `date`, `emergency`, `friend`, `kin`, `me`, `met`, `muse`, `neighbor`, `parent`, `sibling`, `spouse`, `sweetheart`

### Anniversary (§2.8.1)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `kind` | `String` | **mandatory** — `birth`, `death`, `wedding` |
| `date` | `PartialDate\|Timestamp` | **mandatory**, defaultType: `PartialDate` |
| `place` | `Address` | optional |

### PartialDate (§2.8.1)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `year` | `UnsignedInt` | optional |
| `month` | `UnsignedInt` | optional — 1–12; requires `year` or `day` |
| `day` | `UnsignedInt` | optional — 1–31; requires `month` |
| `calendarScale` | `String` | optional — CLDR calendar name (lowercase) |

### Timestamp (§2.8.1)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | MUST be set when used as `Anniversary.date` variant |
| `utc` | `UTCDateTime` | **mandatory** |

### Note (§2.8.3)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `note` | `String` | **mandatory** |
| `created` | `UTCDateTime` | optional |
| `author` | `Author` | optional |

### Author (§2.8.3)

At least one of `name` or `uri` MUST be set.

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `name` | `String` | optional |
| `uri` | `String` | optional |

### PersonalInfo (§2.8.4)

| Property | Type | Attr |
|----------|------|------|
| `@type` | `String` | |
| `kind` | `String` | **mandatory** — `expertise`, `hobby`, `interest` |
| `value` | `String` | **mandatory** |
| `level` | `String` | optional — `high`, `medium`, `low` |
| `listAs` | `UnsignedInt` | optional |
| `label` | `String` | optional |

### JCardProp (RFC 9555 §2.15.1)

jCard property tuple: `[name, params, valueType, value]` per RFC 7095 §3.3.

---

## Reserved & extension mechanisms

| Item | Usage |
|------|-------|
| `extra` | Reserved property name — never appears on JSContact objects |
| `Resource` | Reserved type name — use concrete subtypes only |
| Vendor properties | `domain:name` format (ABNF `v-extension`); preserved opaquely |
| Vendor enum values | Same `v-extension` format on enumerable properties |
| Unknown IANA properties | MUST preserve; MUST NOT treat as invalid |

---

## Type index (alphabetical)

| # | Type | Section |
|---|------|---------|
| 1 | Address | §2.5.1.1 |
| 2 | AddressComponent | §2.5.1.2 |
| 3 | Anniversary | §2.8.1 |
| 4 | Author | §2.8.3 |
| 5 | Calendar | §2.4.1 |
| 6 | Card | §2 |
| 7 | CryptoKey | §2.6.1 |
| 8 | Directory | §2.6.2 |
| 9 | EmailAddress | §2.3.1 |
| 10 | JCardProp | RFC 9555 |
| 11 | LanguagePref | §2.3.4 |
| 12 | Link | §2.6.3 |
| 13 | Media | §2.6.4 |
| 14 | Name | §2.2.1.1 |
| 15 | NameComponent | §2.2.1.2 |
| 16 | Nickname | §2.2.2 |
| 17 | Note | §2.8.3 |
| 18 | OnlineService | §2.3.2 |
| 19 | Organization | §2.2.3 |
| 20 | OrgUnit | §2.2.3 |
| 21 | PartialDate | §2.8.1 |
| 22 | PersonalInfo | §2.8.4 |
| 23 | Phone | §2.3.3 |
| 24 | Pronouns | §2.2.4 |
| 25 | Relation | §2.1.8 |
| 26 | Resource | §1.4.4 (reserved) |
| 27 | SchedulingAddress | §2.4.2 |
| 28 | SpeakToAs | §2.2.4 |
| 29 | Timestamp | §2.8.1 |
| 30 | Title | §2.2.5 |

Plus registry primitives: `Boolean`, `Id`, `Int`, `Number`, `PatchObject`, `String`, `UnsignedInt`, `UTCDateTime`. Plus reserved `Resource` (§1.4.4) and `JCardProp` (RFC 9555).

---

## Validation rules (summary)

- All property/type/enum names case-sensitive
- `@type` implied by parent property when unambiguous; MUST be set on top-level / union variants
- Mandatory properties MUST be present for valid instances
- Vendor-specific and unknown IANA properties: preserve on read/write
- Version `1.0` on all IANA-registered elements in this inventory
