# ONLYOFFICE packaging

## Bundled in WeGotWorkspace (default)

Monorepo and release builds put the static editor under:

`packages/apps/office/build/`

with manifest:

`packages/apps/office/plugin.json`

Build it with:

```bash
pnpm --filter @wgw/onlyoffice-web build
```

Root `pnpm build` includes that step. The API serves `/office/` from `office/build` and registers the bundled plugin from `office/plugin.json`.

**Do not** unpack release artifacts into `wgw-plugins/` for local dev — that path is only for optional plugin ZIP installs.

## Optional plugin ZIP (separate distribution)

To ship ONLYOFFICE as an add-on for existing installs:

```bash
pnpm run release:plugin:onlyoffice
```

Output in `dist/releases/`:

- `wgw-plugin-onlyoffice-<version>.zip` (contains `onlyoffice/plugin.json` + `onlyoffice/assets/…`)
- `wgw-plugin-onlyoffice-manifest.json`
- `wgw-plugin-onlyoffice-manifest.sig` (when signing key is configured)

Install via **Admin → Plugins** (upload ZIP), or unpack so files land at:

`wgw-plugins/onlyoffice/`

not inside `wgw-plugins/wgw-plugins/…` (that happens when the ZIP is extracted into `wgw-plugins/` instead of the install root).

## Verify

- `GET /api/v1/plugins` lists `onlyoffice`
- `/office/` and `/office/editor` load
- `GET /api/v1/office/capabilities` reports `indexReady: true`
