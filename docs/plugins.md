# Plugins

Optional product features ship as **plugins**. They are always installed separately from the core WeGotWorkspace release — never bundled in the deploy ZIP.

Plugin packages and releases live in the [WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins) organization.

Core discovers installed plugins via `GET /api/v1/plugins`, serves each plugin’s static UI at the route declared in `plugin.json` (`appTile.route`), and exposes `POST /api/v1/plugins/{id}/session` for browser UI session cookies.

## Install

1. Download a plugin ZIP from [WeGotWorkspace/plugins releases](https://github.com/WeGotWorkspace/plugins/releases).
2. In WeGotWorkspace, open **Admin → Plugins** and upload the ZIP.

Or unpack manually under:

`wgw-plugins/{plugin-id}/`

(with `plugin.json` and `assets/` directly under that folder — not nested twice under `wgw-plugins/`).

## Verify

- `GET /api/v1/plugins` lists the plugin as active with `runtime.indexReady: true` when assets are present
- The plugin’s declared `appTile.route` loads in the browser
- `POST /api/v1/plugins/{id}/session` establishes the UI session cookie when required

Plugin file saves use **Drive API** and WebDAV from the plugin client — core does not expose plugin-specific document endpoints.

Build and release plugins from **[WeGotWorkspace/plugins](https://github.com/WeGotWorkspace/plugins)**, not from this monorepo.
