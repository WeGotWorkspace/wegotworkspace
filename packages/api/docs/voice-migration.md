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

## Baby-step migration

Each step should pass **`composer test`** (voice suite) before moving on. Flip only one layer at a time; roll back by setting `WGW_VOICE_SIGNALING=legacy`.

| Step | What | How you know it worked |
|------|------|------------------------|
| 0 | Stay on `legacy` (default) | Meet works in dev/staging as today |
| 1 | Automated parity | `VoiceSignalingParityTest` + `VoiceEndpointsTest` with `WGW_VOICE_SIGNALING=laravel` |
| 2 | Fix Laravel gaps | Parity tests green; auth uses same paths as legacy (`LegacyVoiceAuth` in `VoiceActorResolver`) |
| 3 | Staging flip | `.env` → `WGW_VOICE_SIGNALING=laravel`; manual 2-peer call + guest knock/admit |
| 4 | CI default | `phpunit.xml` / deploy env default `laravel` after staging soak |
| 5 | Remove legacy | Delete `packages/api/legacy/Voice/` and gateway when step 3–4 are stable |

### Staging flip (step 3)

```env
WGW_VOICE_SIGNALING=laravel
```

No Meet UI changes — same `/api/v1/voice/*` routes. If signaling breaks, set back to `legacy` and check Laravel logs for `VoiceResponseException` payloads (`error`, `message`).

### Known parity fixes (Laravel)

- **Guest `join`:** reuse `sessionKey` from the body when present (reconnect / second tab), same as legacy.
- **Auth:** `VoiceActorResolver` delegates to `LegacyVoiceAuth` (JWT, `sabre_ui_auth` cookie, HTTP Basic) so logged-in Meet matches main-branch behavior.

## Migration steps (later)

1. Run calls with `WGW_VOICE_SIGNALING=laravel` in staging; compare poll/send payloads and WebRTC behavior.
2. Port any fixes found in legacy only into `VoiceSignalingService` / `VoiceActorResolver`.
3. When parity is proven, set default to `laravel` and remove `packages/api/legacy/Voice/`.

## Not included in legacy copy

Main’s `/voice/` static kernel (`VoiceKernel`, `VoiceEntry`, `VoiceStatic`) is **not** copied — greenfield serves Meet via the workspace UI (`/meet/`, `/meet/guest/`), not the old Aura `/voice/` app shell.
