# ONLYOFFICE plugin

Office editing (`/office/`, `/office/editor`) is provided by the **ONLYOFFICE plugin**, distributed separately from the core WeGotWorkspace release.

- **Source & releases:** [github.com/WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins) (`onlyoffice/`)
- **Plugin id:** `onlyoffice`

## Install

1. Download the latest `wgw-plugin-onlyoffice-*.zip` from the [plugins releases](https://github.com/WeGotWorkspace/plugins/releases).
2. In WeGotWorkspace, open **Admin → Plugins** and upload the ZIP.

Or unpack manually so files land at:

`wgw-plugins/onlyoffice/`

(with `plugin.json` and `assets/` directly under that folder — not nested twice under `wgw-plugins/`).

## Verify

- `GET /api/v1/plugins` lists `onlyoffice` as active
- `/office/` and `/office/editor` load
- `GET /api/v1/office/capabilities` reports `indexReady: true`

## Core vs plugin

The core deploy ZIP does **not** include ONLYOFFICE assets. Drive and the API expose office routes when the plugin is installed; without it, `/office/` shows an install hint.

Build and release the plugin from the **[WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins)** repository (`onlyoffice/`), not from this monorepo.
