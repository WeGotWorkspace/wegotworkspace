# WeGotWorkspace Update Rollout

## Channels

- `staging`: enable via `WGW_UPDATE_FEED_URL` pointing to a staging manifest feed.
- `stable`: default production feed with signed release metadata.

## Release Checklist

1. Update `apps/wegotworkspace/VERSION`.
2. Build workspace (`pnpm run build`).
3. Build release assets (`pnpm release`).
4. Publish `dist/releases/wegotworkspace-<version>.zip`, `manifest.json`, and `manifest.sig`.
5. Ensure `manifest.json` includes `package_url`, `checksum_sha256`, `checksum_signature`, `min_php`, and `min_schema`.

## Integration Test Scenario

1. Install v1 with the web installer into an empty SQLite DB.
2. Create baseline data:
   - at least one extra user
   - one group and memberships
   - one app setting update from admin panel
3. Point `WGW_UPDATE_FEED_URL` to a manifest for v2.
4. Open `/admin/updates`:
   - verify `updateAvailable = true`
   - verify compatibility checks are all green
5. Run one-click update.
6. Verify after update:
   - login still works
   - users/groups/settings data preserved
   - `schemaVersion` is not lower than before
   - `lastResult.ok = true`
7. Simulate failure (bad checksum or broken package) and confirm rollback:
   - app remains reachable
   - previous version restored
   - `lastResult.ok = false` with message

## Operational Notes

- Update process writes logs to `wgw-content/updates/update.log`.
- Maintenance mode marker: `wgw-content/updates/.maintenance`.
- Single-flight lock marker: `wgw-content/updates/update.lock`.
- Keep `wgw-src/Update/update-public-key.pem` synchronized with release signing key rotation.
