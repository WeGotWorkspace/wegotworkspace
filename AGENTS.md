# Agent instructions (WeGotWorkspace)

## API greenfield (read first)

When working on **`packages/api`** REST or a new Laravel API:

1. Read **`.cursor/rules/api-greenfield.mdc`** (always applied).
2. Follow **`packages/api/docs/greenfield-plan.md`** — bootstrap order, definition of done, enforcement.
3. Run **`composer --working-dir packages/api greenfield:guard`** before considering API work complete.

**Contract parity ≠ code parity.** Match `packages/api/openapi/openapi.json` via tests; reimplement logic in Laravel layers. Do not wrap or move legacy `packages/api/src/` handlers (`MailApi`, `*Kernel`, `ApiKernel`, `DomainRouteService`).

## Legacy API (`packages/api/src/`)

Reference only for behavior and parity tests. Do not add features or new REST endpoints there.

## Storage

All file I/O for drive, notes, office, and WebDAV **files** uses Laravel **Flysystem** (`WgwStorage`). See `.cursor/rules/api-storage-flysystem.mdc`.

## Commits

Do not `git commit` unless the user asks. See `.cursor/rules/no-auto-git-commit.mdc`.
