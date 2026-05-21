# @wgw/api — OpenAPI contract + Laravel REST API

Greenfield Laravel app for `/api/v1/*`, plus the **OpenAPI contract** and generated TypeScript types for the UI. Legacy `packages/api/src/` is gone — implement against `openapi/openapi.json` only.

## Layout

| Path | Purpose |
|------|---------|
| `openapi/openapi.json` | Source of truth for paths, methods, request/response shapes |
| `openapi/generated/*` | Generated TS types + `openapi.built.json` (committed) |
| `scripts/*` | OpenAPI build + typegen only |
| `docs/greenfield-plan.md` | How to scaffold the new Laravel app when ready |

## Commands

```bash
composer --working-dir packages/api test      # PHPUnit (phases 0–4)
pnpm test:api-done-gate                       # greenfield guard + OpenAPI contract + PHPUnit
pnpm --filter @wgw/api test:e2e               # Playwright API smoke (starts php -S unless already on :9080)
pnpm test:api-e2e:docker                      # same tests against Docker (compose.ci.yml)
pnpm --filter @wgw/api typegen                # regenerate TS types from openapi/generated/openapi.built.json
pnpm --filter @wgw/api typegen:check          # fail if generated files are stale
```

**PHP:** `^8.3` (CI uses 8.3). PHP 8.5 is fine locally; API responses suppress deprecation display so `/api/v1/*` stays clean JSON.

`openapi/openapi.json` is the hand-edited spec. `openapi/generated/openapi.built.json` is the enriched document used for typegen (committed). After editing `openapi.json`, update the built file in the same change (PHP enrichment was removed with the legacy runtime).

## Implementing the API

Scaffold a **new** Laravel application (fresh `composer create-project` or `laravel new`) under `packages/api/` when starting implementation. Follow `docs/greenfield-plan.md` and `.cursor/rules/api-greenfield.mdc`.

Do not restore `packages/api/src/` into this tree.
