# RTC network matrix (manual audit)

Enable browser logging with `?rtcDebug=1` on meet or docs URLs. Logs use prefix `[rtc][channel][peerId][event]`.

## Prerequisites

- Admin **Voice / Meet** settings: valid STUN URL(s) and external TURN (`turn:host:3478?transport=udp` format).
- Trickle ICE test page shows a **relay** candidate row before go-live.
- Docker dev stack or shared-hosting install with `/api/v1/voice/*` and `/api/v1/collab/*` reachable.

## Scenarios

| ID | Scenario | Steps | Pass criteria |
| -- | -------- | ----- | ------------- |
| N0 | Direct LAN | Two browsers, same network, meet room | `[rtc][voice][…][selected-pair]` shows `host` or `srflx`; A/V connected |
| N1 | Guest meet TURN | Guest join URL (no auth) | Guest bootstrap RTC has turn URLs; not empty defaults |
| N2 | Docs collab | Two users, same doc | Data channel open; Yjs sync; `[rtc][collab][…][dc-open]` |
| N3 | Force relay (debug) | Add `?rtcForceRelay=1` or set `VITE_WGW_RTC_FORCE_RELAY=1` | `iceTransportPolicy: relay` in `pc-created` log; selected pair `relay` |
| N4 | Relay fallback | Symmetric NAT or firewall block direct | `[relay-fallback-start]` then `[relay-fallback-offer-sent]` or connected |
| N5 | Hotspot | Phone hotspot client | Session connects (often via `relay`); no endless `failed` |
| N6 | Unknown peer recovery | Docs: stale tab after server prune | `[peer-recover-start]` / `[peer-recover-success]` |
| N7 | Poll steady | In-call 5+ minutes | Poll continues; no HTML error responses |
| N8 | Leave cleanup | Leave meet/docs | Peers removed; `/leave` succeeds |
| N9 | Signaling API | `pnpm test:collab-api` | join/poll/send/leave return JSON |

## Shared hosting notes

- Signaling is **HTTP poll only** (Apache + mod_php); no WebSocket daemon required.
- TURN must be **external** (coturn on VPS); STUN-only is insufficient for ~20% of networks.
