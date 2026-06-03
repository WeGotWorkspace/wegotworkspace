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

- `GET /api/v1/plugins` lists `onlyoffice` as active with `runtime.indexReady: true`
- `/office/` and `/office/editor` load (routes come from the plugin manifest `appTile.route`)
- `POST /api/v1/plugins/onlyoffice/session` establishes the browser UI session cookie

## Core vs plugin

The core deploy ZIP does **not** include ONLYOFFICE assets. Core discovers plugins via `GET /api/v1/plugins`, serves static UI at each plugin’s `appTile.route`, and exposes generic session hooks at `POST /api/v1/plugins/{id}/session`. File saves use **Drive API** and WebDAV — there are no office-specific document endpoints in core.

Build and release the plugin from the **[WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins)** repository (`onlyoffice/`), not from this monorepo.
