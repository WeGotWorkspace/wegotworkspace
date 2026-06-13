# RFC 9982 — JSContact 2.0 and uid Conversion Updates

> **Source:** [RFC 9982](https://www.rfc-editor.org/info/rfc9982) (Proposed Standard)  
> **Updates:** [RFC 9555](https://www.rfc-editor.org/info/rfc9555) §2.1.1 (uid conversion only)  
> **Related:** [RFC 9553](https://www.rfc-editor.org/info/rfc9553) (JSContact types), [RFC 9610](https://www.rfc-editor.org/info/rfc9610) (JMAP Contacts)

RFC 9982 does **not** obsolete RFC 9555. It defines JSContact version **2.0** and redefines how the optional vCard `UID` maps to the JSContact `uid` property. All other vCard ↔ JSContact conversion rules remain in RFC 9555 — see `rfc9555-conversion-matrix.md`.

---

## Relationship to RFC 9555

| Aspect | RFC 9555 | RFC 9982 |
|--------|----------|----------|
| Status | Internet Standard (May 2024) | Proposed Standard; **updates** RFC 9555 |
| Scope | Full bidirectional vCard ↔ JSContact conversion | JSContact 2.0 + uid conversion delta + JSCOMPS IANA registration |
| JSContact version | Assumes 1.0 (`uid` mandatory) | Introduces 2.0 (`uid` optional) |
| vCard `UID` → JSContact `uid` (v1.0) | Generate unique id if vCard lacks `UID` (§2.1.1) | Unchanged for version `"1.0"` cards |
| vCard `UID` → JSContact `uid` (v2.0+) | N/A (did not exist) | **MUST NOT** generate `uid` when vCard lacks `UID` (§5) |
| JSCOMPS parameter | Defined §3.3.1 but not registered at IANA | Registered in IANA vCard Parameters registry (§6) |

---

## JSContact version 2.0 (§3–§4)

- `Card.version` becomes `"2.0"`.
- `uid` changes from **mandatory** to **optional** (`String`, optional).
- A Card without `uid` cannot appear in `members` or `relatedTo` (§4).
- Valid 1.0 Cards remain valid 2.0 Cards; no migration required.
- Implementations **MUST NOT** reject a 2.0+ Card solely for missing `uid` (§3).
- Implementations **SHOULD NOT** emit version `"1.0"` Cards when converting from vCard (§5).

---

## uid conversion rules (§5)

### vCard → JSContact

| JSContact version | vCard has `UID` | Rule |
|-------------------|-----------------|------|
| `"1.0"` | yes | Copy value to `uid` (RFC 9555 §2.1.1) |
| `"1.0"` | no | **MUST** generate `uid` (implementation-specific; SHOULD be stable) |
| `"2.0"` or later | yes | Copy value to `uid` |
| `"2.0"` or later | no | **MUST NOT** set `uid` |

### JSContact → vCard

RFC 9982 does not redefine the reverse direction. When a Card has `uid`, emit vCard `UID` per RFC 9555 reverse rules. When `uid` is absent, omit vCard `UID`.

---

## API / JMAP implications

RFC 9610 (JMAP Contacts) requires `uid` for synchronization. A REST/JMAP layer may still assign or require `uid` at persistence time even when the converter emits JSContact 2.0 without `uid`. That is an API concern, not a conversion-spec violation.

This codebase currently:

- Converts vCard → JSContact **version `"1.0"`** and generates `uid` when missing (RFC 9555 §2.1.1).
- Assigns `uid` in `ContactCardRepository` when the API layer requires one for CardDAV/JMAP storage.

Supporting JSContact 2.0 conversion (omit generated `uid`, set `version: "2.0"`) is a follow-up if the API adopts optional `uid` semantics.

---

## References

- [RFC 9982](https://www.rfc-editor.org/info/rfc9982) — JSContact Version 2.0
- [RFC 9555](https://www.rfc-editor.org/info/rfc9555) — base conversion matrix → `rfc9555-conversion-matrix.md`
- [RFC 9553](https://www.rfc-editor.org/info/rfc9553) — type definitions → `rfc9553-jscontact-types.md`
- [RFC 9610](https://www.rfc-editor.org/info/rfc9610) — JMAP Contacts → `rfc9610-summary.md`
