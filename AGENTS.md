# Agent instructions (WeGotWorkspace)

## API greenfield (read first)

When working on **`packages/api`** REST or a new Laravel API:

1. Read **`.cursor/rules/api-greenfield.mdc`** (always applied).
2. Follow **`packages/api/docs/greenfield-plan.md`**.
3. Use **`packages/api/openapi/openapi.json`** as the only in-tree API reference — there is **no** legacy PHP to copy.

**Contract parity ≠ code parity.** Match OpenAPI via feature tests; implement logic in new Laravel layers. Legacy `packages/api/src/` was removed from the workspace on purpose.

## `packages/api` layout

| Present | Absent (do not restore) |
|---------|-------------------------|
| `openapi/`, `scripts/` (typegen), `docs/greenfield-plan.md` | `src/`, `*Kernel`, `MailApi`, `ApiKernel`, dual `App\` autoload |

PHP tests and `composer.json` appear only **after** Phase 0 scaffold in the greenfield plan.

## Storage (when implementing)

File I/O for drive, notes, office, and WebDAV **files** uses Laravel **Flysystem** (`WgwStorage`). See `.cursor/rules/api-storage-flysystem.mdc`.

## Commits

Do not `git commit` unless the user asks. See `.cursor/rules/no-auto-git-commit.mdc`.
