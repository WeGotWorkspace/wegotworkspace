# Voice / Meet signaling

Meet uses `POST /api/v1/voice/{room,join,poll,send,leave,chat}` (OpenAPI). Signaling is implemented in Laravel only:

| Component | Role |
|-----------|------|
| `app/Services/Voice/VoiceSignalingService.php` | PDO tables `voice_peers` / `voice_messages` via `DB::connection('wgw')` |
| `app/Services/Voice/VoiceActorResolver.php` | Guest `sessionKey` and authenticated owner markers |
| `app/Services/Voice/VoiceRequestAuth.php` | JWT bearer, `sabre_ui_auth` cookie, HTTP Basic |
| `app/Http/Controllers/Api/V1/Voice/VoiceController.php` | HTTP entry |

Meet **UI** is in `packages/apps` (`meet-core`); no client changes required for API work.

## Tests

```bash
cd packages/api && composer test -- --filter Voice
```

Coverage includes guest join/poll/leave, `sessionKey` reuse on re-join, and room active probe.

## History

Migration from main-branch PDO signaling completed on branch `migrate/meet-api`: parity tests, staging validation, then removal of `packages/api/legacy/Voice/` and `WGW_VOICE_SIGNALING`.
