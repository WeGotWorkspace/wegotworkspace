# API stack

## Laravel

- REST JSON under `/api/v1/*`
- JWT RS256 + refresh (contract in OpenAPI — not Sanctum PAT shape for v1 parity)
- Queues/cache: `database` / `file` — no Redis requirement
- **File storage:** Flysystem disks (`wgw_files`, `wgw_notes`, `wgw_data`) — `league/flysystem` via `Illuminate\Filesystem`
- OpenAPI: `openapi/openapi.json`; Scramble is internal

## SabreDAV (separate entry)

- `dav.php` — DAV wire stays out of REST controllers
- **File** resources use the same Flysystem disks as REST; Cal/Card stay PDO
- Plugins delegate to Laravel services — no duplicate path or ACL logic

## Single-tenant

- One install per `wgw-config.php`; multitenancy deferred
