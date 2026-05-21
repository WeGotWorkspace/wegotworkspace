# Voice / Meet signaling migration

Meet uses the same HTTP contract on every branch: `POST /api/v1/voice/{room,join,poll,send,leave,chat}` (OpenAPI).

## Dual backend (greenfield branch)

| Path | Role |
|------|------|
| `packages/api/legacy/Voice/` | **Temporary** copy of main-branch signaling (PDO, `voice_peers` / `voice_messages`) |
| `packages/api/app/Services/Voice/VoiceSignalingService.php` | Greenfield Laravel implementation (migrate toward this) |
| `packages/api/app/Services/Voice/LegacyVoiceSignalingGateway.php` | Adapter: Laravel request → legacy dispatch |
| `packages/api/app/Services/Voice/VoiceSignalingRouter.php` | Switches implementation via config |

## Configuration

```env
# legacy = main-branch behavior (default during migration)
# laravel = VoiceSignalingService
WGW_VOICE_SIGNALING=legacy
```

Config key: `config('wgw.voice.signaling')`.

## What stays on Laravel

Everything except signaling dispatch: mail, drive, admin, auth JWT, UI kernels, WebDAV, installer, etc.

Meet **UI** lives in `packages/apps` (`meet-core`); it only talks to `/api/v1/voice/*`. No change required when flipping `WGW_VOICE_SIGNALING`.

## Migration steps (later)

1. Run calls with `WGW_VOICE_SIGNALING=laravel` in staging; compare poll/send payloads and WebRTC behavior.
2. Port any fixes found in legacy only into `VoiceSignalingService` / `VoiceActorResolver`.
3. When parity is proven, set default to `laravel` and remove `packages/api/legacy/Voice/`.

## Not included in legacy copy

Main’s `/voice/` static kernel (`VoiceKernel`, `VoiceEntry`, `VoiceStatic`) is **not** copied — greenfield serves Meet via the workspace UI (`/meet/`, `/meet/guest/`), not the old Aura `/voice/` app shell.
