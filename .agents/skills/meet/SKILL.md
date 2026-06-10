---
name: meet
description: Meet video calls and room signaling — Laravel MeetSignalingService, HTTP room session API, meet-core UI, and lib/rtc WebRTC stack. Use when working on meet, rooms, RTC, or collab signaling.
paths:
  - "packages/apps/src/meet-core/**"
  - "packages/apps/src/lib/rtc/**"
  - "packages/api/app/Services/Meet/**"
  - "packages/api/app/Http/Controllers/Api/V1/Rooms/**"
  - "packages/api/app/Http/Controllers/Api/V1/Meetings/**"
---

# Meet and RTC

Meet spans **Laravel signaling** (`packages/api`) and **browser RTC** (`packages/apps`). File collab (docs) shares room routes but uses a data-channel binding — see `lib/rtc/README.md`.

## Quick decision matrix

| Task | Read |
|------|------|
| HTTP routes / signaling service | `packages/api/docs/meet-signaling.md`, [api/rest-design.md](../api/rest-design.md) |
| WebRTC kernel (mesh, ICE, poll) | `packages/apps/src/lib/rtc/README.md` |
| Meet product UI | `packages/apps/src/meet-core/` |
| Storybook (offline) | [storybook/offline-first.md](../storybook/offline-first.md), `createMeetAppBootstrap` |
| Tests | [testing/ui-architecture.md](../testing/ui-architecture.md), `packages/api/docs/meet-signaling.md` |
| REST layering | [api/SKILL.md](../api/SKILL.md), [api/layers.md](../api/layers.md) |

## API (Laravel only)

Signaling lives in **`MeetSignalingService`** — not legacy `Voice/` or `packages/api/src/`.

| Component | Role |
|-----------|------|
| `app/Services/Meet/MeetSignalingService.php` | `meet_peers` / `meet_messages` on `wgw` |
| `app/Services/Meet/MeetActorResolver.php` | Guest `sessionKey`, authenticated owner |
| `app/Http/Controllers/Api/V1/Rooms/RoomSessionController.php` | `/rooms/{roomId}/*` |
| `app/Http/Controllers/Api/V1/Meetings/MeetingsController.php` | `/meetings/rooms` lifecycle |

Key routes: join/poll/send/leave on `/rooms/{roomId}/*`; chat on `POST …/messages`; RTC ICE on `GET …/configuration`. Full table: `packages/api/docs/meet-signaling.md`.

```bash
cd packages/api && composer test -- --filter Meet
pnpm test:meet-api
```

## UI stack

| Layer | Path |
|-------|------|
| App / workspace / panes | `meet-core/src/*-app.tsx`, `meet-workspace`, `meet-*-pane.tsx` |
| RTC session wrapper | `meet-core/src/meet-rtc-session.ts`, `use-meet-rtc.ts` |
| Shared RTC kernel | `lib/rtc/` — `createRtcSession`, `RtcPeerMesh`, `signaling/http-client.ts` |

**Controller rule:** product controllers own UX; **no `RTCPeerConnection` in controllers** — only in `lib/rtc` + thin `*-rtc-session.ts` wrappers.

### Meet invariants (do not break)

| Topic | Rule |
|-------|------|
| A/V | WebRTC media binding only |
| Chat + control | HTTP messages + poll — **not** data channels |
| Signaling | HTTP on `/api/v1/rooms/{roomId}/*` |
| Meet SDP | Sanitize **inbound remote** SDP only — never rewrite local before `setLocalDescription` |
| Initiator | Meet uses `higherId` (lexicographic peer id) |
| Guest tabs | Unauthenticated fetch + `sessionKey` on poll/send/chat |

Debug: `?rtcDebug=1` on URL. Relay-only dev: `?rtcForceRelay=1` or `VITE_WGW_RTC_FORCE_RELAY=1`.

## Storybook (mock-tier required)

Use `@/lib/api/mock/meet-bootstrap` — no live signaling in default stories:

```tsx
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";

export const Default: Story = {
  args: { ...createMeetAppBootstrap(), onLogout: () => {} },
};
```

Reference: `meet-core/stories/meet-app.stories.tsx`. **`Live …`** stories need API + Docker — optional only ([storybook/offline-first.md](../storybook/offline-first.md)).

## Operations DI (tech debt)

Prefer **`operations`** on meet controllers over direct `@/lib/api/wgw/*` imports. Tracker: [#71](https://github.com/WeGotWorkspace/wegotworkspace/issues/71).

## When unsure

- HTTP contract: `packages/api/openapi/openapi.json` + feature tests
- Client behavior: `lib/rtc/README.md` + existing Vitest under `meet-core/` and `lib/rtc/`
- Do not restore deleted legacy Voice PHP
