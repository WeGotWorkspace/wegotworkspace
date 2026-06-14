# API conversion test fixtures

Curated subsets of upstream interop fixtures for vCard ↔ JSContact and iCalendar ↔ JMAP calendar conversion tests. We do **not** vendor entire upstream repositories.

## Contacts

| Directory | Source | License | Assertion style |
|-----------|--------|---------|-----------------|
| `Contacts/*.vcf` + `*.json` | WGW-authored golden pairs | Project | Strict golden JSON match + round-trip |
| `Contacts/Interop/audriga/` | [audriga/jmap-php-icalendar_vcard](https://github.com/audriga/jmap-php-icalendar_vcard) `tests/resources/` | MIT | Parse + round-trip stability only |

### Audriga subset

Real-world exports from groupware stacks (Horde, Nextcloud, Roundcube, Microsoft Exchange). Filenames match upstream.

## Calendars

| Directory | Source | License | Assertion style |
|-----------|--------|---------|-----------------|
| `Calendars/Fastmail/` | [fastmail/Text-JSCalendar](https://github.com/fastmail/Text-JSCalendar) `testdata/icalendar/` | CPAN (Artistic/GPL) | Key-field golden JSON + ICS round-trip |
| `Calendars/Interop/audriga/` | [audriga/jmap-php-icalendar_vcard](https://github.com/audriga/jmap-php-icalendar_vcard) `tests/resources/` | MIT | Parse + round-trip stability only |

## Fastmail normative references

- **Text::JSContact** ([CPAN Text-JSContact](https://metacpan.org/pod/Text::JSContact)) — RFC 9555 figure tests in `t/rfc9555.t` and `t/apple.t`
- **Text::JSCalendar** ([GitHub fastmail/Text-JSCalendar](https://github.com/fastmail/Text-JSCalendar)) — iCalendar golden `.ics` files

WGW keeps its 27 contact golden pairs as primary strict goldens; external fixtures extend coverage per [#160](https://github.com/WeGotWorkspace/wegotworkspace/issues/160) (parent [#137](https://github.com/WeGotWorkspace/wegotworkspace/issues/137)).
