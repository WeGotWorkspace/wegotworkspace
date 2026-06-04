# No legacy API in workspace

`packages/api/src/` and related legacy PHP were **removed**. The greenfield Laravel app lives under `packages/api/app/`.

## Allowed

- `openapi/openapi.json` and generated types
- Git history / release tags on `main` to learn behavior (outside the workspace)
- Feature tests that encode expected behavior

## Forbidden

- Restoring `src/`, `*Kernel`, `MailApi`, or dual `App\` autoload
- "Delegate to legacy" in new Laravel code
- Copying legacy files into `app/` without a full rewrite

New work extends the existing Laravel layers per `packages/api/docs/api-done-gate.md` and `openapi/openapi.json`.
