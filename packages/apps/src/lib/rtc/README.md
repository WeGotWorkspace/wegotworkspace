# `@/lib/rtc` — WebRTC platform kernel

Shared browser RTC stack for **meet**, **docs**, and future **chat / sheet / slides** apps.

## Layers

| Module                          | Role                                            |
| ------------------------------- | ----------------------------------------------- |
| `config.ts`                     | ICE / TURN → `RTCConfiguration`                 |
| `signaling/http-client.ts`      | HTTP join / poll / send / leave                 |
| `session/peer-mesh.ts`          | **`RtcPeerMesh`** — one ICE engine per room     |
| `session/bindings.ts`           | Media or data-channel attachment                |
| `telemetry/selected-pair.ts`    | Logs selected candidate pair on connect         |
| `hooks/use-rtc-session.ts`      | React lifecycle wrapper                         |
| `signaling/create-client.ts`    | `createRtcSignalingClient()` — channel defaults |
| `session/create-rtc-session.ts` | `createRtcSession()` — signaling + mesh factory |

Meet uses `meet-core/src/meet-rtc-session.ts` + `use-meet-rtc.ts` (media binding, meet SDP sanitization).
Docs uses `docs-collab/docs-rtc-session.ts` (data binding).

Both use `DEFAULT_RTC_POLL_INTERVALS` and `recoverOnUnknownPeer: true` via `createRtcSession()`.

## Per-app pattern

- `createRtcSession()` / `*-rtc-session.ts` — shared factory + thin app wrappers
- `use-*-rtc.ts` — bindings and product hooks
- `use-*-controller.tsx` — product UX only; **no** `RTCPeerConnection`

## Debug

Add `?rtcDebug=1` to the URL. Logs use prefix:

`[rtc][channel][peerId][event]`

Force TURN relay-only mode (dev/debug, not admin):

- URL: `?rtcForceRelay=1`
- Vite/Storybook: `VITE_WGW_RTC_FORCE_RELAY=1` in `.env.local`

Manual network checks: [`docs/testing/rtc-network-matrix.md`](../../../../docs/testing/rtc-network-matrix.md)

## Initiator rules

| Channel         | Rule                       |
| --------------- | -------------------------- |
| `voice` (meet)  | Higher peer id sends offer |
| `collab` (docs) | Lower peer id sends offer  |

Set via `initiatorRule: "higherId" | "lowerId"` on `RtcPeerMesh`.

## Relay fallback

On `connectionState === "failed"`, initiator **recreates** the peer connection in relay-only mode and sends a fresh offer (not `setConfiguration` + `restartIce`).
