# Meet signaling

Meet uses `POST /api/v1/meet/{room,join,poll,send,leave,chat}` and `GET /api/v1/meet/rtc` (OpenAPI). Signaling is implemented in Laravel only:

| Component | Role |
|-----------|------|
| `app/Services/Meet/MeetSignalingService.php` | PDO tables `meet_peers` / `meet_messages` via `DB::connection('wgw')` |
| `app/Services/Meet/MeetActorResolver.php` | Guest `sessionKey` and authenticated owner markers |
| `app/Services/Meet/MeetRequestAuth.php` | JWT bearer, `sabre_ui_auth` cookie, HTTP Basic |
| `app/Http/Controllers/Api/V1/Meet/MeetController.php` | HTTP entry |

Meet **UI** is in `packages/apps` (`meet-core`); client RTC channel is `meet`.

## Tests

```bash
cd packages/api && composer test -- --filter Meet
pnpm test:meet-api
```

Coverage includes guest join/poll/leave, `sessionKey` reuse on re-join, and room active probe.

## History

Migration from main-branch PDO signaling completed on branch `migrate/meet-api`: parity tests, staging validation, then removal of `packages/api/legacy/Voice/` and `WGW_VOICE_SIGNALING`. Schema migration v8 renames legacy `voice_*` tables and settings keys to `meet_*`.
