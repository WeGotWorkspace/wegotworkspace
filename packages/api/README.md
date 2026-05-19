# @wgw/api — HTTP contract only

This package holds the **OpenAPI contract** and generated TypeScript types for the WeGotWorkspace REST API (`/api/v1/*`).

There is **no PHP runtime** here. Legacy `src/` and the partial Laravel scaffold were removed so greenfield work matches the contract without copying legacy code.

## Layout

| Path | Purpose |
|------|---------|
| `openapi/openapi.json` | Source of truth for paths, methods, request/response shapes |
| `openapi/generated/*` | Generated TS types + `openapi.built.json` (committed) |
| `scripts/*` | OpenAPI build + typegen only |
| `docs/greenfield-plan.md` | How to scaffold the new Laravel app when ready |

## Commands

```bash
pnpm --filter @wgw/api typegen          # regenerate TS types from openapi/generated/openapi.built.json
pnpm --filter @wgw/api typegen:check    # fail if generated files are stale
```

`openapi/openapi.json` is the hand-edited spec. `openapi/generated/openapi.built.json` is the enriched document used for typegen (committed). After editing `openapi.json`, update the built file in the same change (PHP enrichment was removed with the legacy runtime).

## Implementing the API

Scaffold a **new** Laravel application (fresh `composer create-project` or `laravel new`) under `packages/api/` when starting implementation. Follow `docs/greenfield-plan.md` and `.cursor/rules/api-greenfield.mdc`.

Do not restore `packages/api/src/` into this tree.
