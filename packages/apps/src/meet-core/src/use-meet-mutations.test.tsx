/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MeetCallSessionState } from "@/meet-core/src/use-meet-call-session";
import { useMeetMutations } from "@/meet-core/src/use-meet-mutations";
import type { MeetRoomState } from "@/meet-core/src/use-meet-room-state";

function createRoomStub(): MeetRoomState {
  return {
    status: "in-call",
    setStatus: vi.fn(),
    setRoomCode: vi.fn(),
    setSelfId: vi.fn(),
    setStartedAt: vi.fn(),
    setElapsedSeconds: vi.fn(),
    resetIdleMediaDefaults: vi.fn(),
    setPeers: vi.fn(),
    setChatMessages: vi.fn(),
    setWaitingForAdmission: vi.fn(),
    setKnockers: vi.fn(),
    setEndedMessage: vi.fn(),
    resetPeerMaps: vi.fn(),
    roomCodeRef: { current: "abc123" },
    selfIdRef: { current: "peer-1" },
    statusRef: { current: "in-call" as const },
    displayNameRef: { current: "Guest" },
  } as unknown as MeetRoomState;
}

function createSessionStub() {
  const meetRtc = {
    leave: vi.fn().mockResolvedValue(undefined),
    getSessionKey: vi.fn(() => null),
  };
  return {
    meetRtc,
    operationsRef: { current: undefined },
    debugRtc: vi.fn(),
    ensureLocalMedia: vi.fn(),
    stopLocalMedia: vi.fn(),
  } as unknown as MeetCallSessionState;
}

describe("useMeetMutations", () => {
  it("does not leave on rerender when the room object identity changes", () => {
    const session = createSessionStub();
    const leaveRef = { current: null as null | (() => Promise<void>) };

    const { rerender, unmount } = renderHook(
      ({ room }) =>
        useMeetMutations({
          room,
          session,
          canModerateKnocks: false,
          leaveRef,
        }),
      { initialProps: { room: createRoomStub() } },
    );

    for (let i = 0; i < 25; i++) {
      rerender({ room: createRoomStub() });
    }

    expect(session.meetRtc.leave).not.toHaveBeenCalled();

    unmount();
    expect(session.meetRtc.leave).toHaveBeenCalledTimes(1);
  });
});
