# SabreDAV

## Entry

- `dav.php` boots Laravel enough to resolve `WgwStorage`, auth, and services — then Sabre `Server`
- Auth validates same principals as REST

## File WebDAV = Flysystem

- User/group file nodes use **`app/DAV/Storage/*`** backed by disk `wgw_files` — same as REST drive/plugins
- Do **not** pass raw `$userFilesPath` / `$groupFilesPath` strings from `Paths::data()` into Sabre FS trees in new code
- CalDAV / CardDAV: PDO backends (unchanged); do not route calendar data through file disks

## Plugins

- Git versioning: `afterWriteContent`, `afterCreateFile` only
- Write guard, versioning: call services that use `WgwStorage` — no business rules or direct `readfile` in plugins

## Data

- DB: Eloquent / `DB` for principals, settings, mail credentials
- Files: **only** Flysystem — shared with REST (see [storage-flysystem.md](storage-flysystem.md))
