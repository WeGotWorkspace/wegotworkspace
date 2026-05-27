# ONLYOFFICE plugin packaging

ONLYOFFICE ships as a separate plugin artifact and installs under:

`apps/wegotworkspace/wgw-plugins/onlyoffice/`

Expected runtime layout:

```text
wgw-plugins/
  onlyoffice/
    plugin.json
    assets/
      index.html
      ...
```

The API plugin registry discovers runtime plugins from `wgw-plugins/*/plugin.json`.
For ONLYOFFICE, `assets/index.html` is used as the Office static entrypoint.

## Build plugin ZIP

```bash
pnpm run release:plugin:onlyoffice
```

Output files are written to `dist/releases/`:

- `wgw-plugin-onlyoffice-<version>.zip`
- `wgw-plugin-onlyoffice-manifest.json`
- `wgw-plugin-onlyoffice-manifest.sig` (when signing key is configured)

The build command first runs `pnpm --filter @wgw/onlyoffice-web build` unless
`WGW_PLUGIN_SKIP_BUILD=1` is set.

## Install plugin ZIP

1. Unpack the ZIP into your install root so files land under
   `wgw-plugins/onlyoffice/`.
2. Activate the plugin via Admin → Plugins (or `POST /api/v1/plugins/onlyoffice/activate`).
3. Verify:
   - `GET /api/v1/plugins` shows `onlyoffice` as active
   - `/office/` and `/office/editor` resolve

