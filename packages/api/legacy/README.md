# Legacy API slices (greenfield migration)

Isolated copies of **working main-branch** behavior, callable from Laravel without restoring `packages/api/src/`.

| Directory | Purpose |
|-----------|---------|
| `Voice/` | Meet WebRTC HTTP signaling (`voice_peers`, `voice_messages`) |

Remove each slice after the matching Laravel service is proven in production.
