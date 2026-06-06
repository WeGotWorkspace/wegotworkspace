/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useMeetInboundMediaHints } from "@/meet-core/src/use-meet-inbound-media-hints";
import type { useMeetRtc } from "@/meet-core/src/use-meet-rtc";

type MeetRtc = ReturnType<typeof useMeetRtc>;

function createMeetRtcStub(): MeetRtc {
  return {
    getPeerIds: () => [],
    getPeerConnection: () => null,
  } as unknown as MeetRtc;
}

describe("useMeetInboundMediaHints", () => {
  it("does not re-run the disabled effect when callback identities change", () => {
    const refreshPeers = vi.fn();
    const meetRtc = createMeetRtcStub();

    const { rerender } = renderHook(
      ({ onEnterInCall }) => {
        const peerInboundSampleRef = useRef(new Map());
        const peerMediaHintRef = useRef(new Map());
        useMeetInboundMediaHints({
          enabled: false,
          meetRtc,
          peerInboundSampleRef,
          peerMediaHintRef,
          refreshPeers,
          onEnterInCall,
        });
      },
      { initialProps: { onEnterInCall: () => {} } },
    );

    expect(refreshPeers).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 25; i++) {
      rerender({ onEnterInCall: () => {} });
    }

    expect(refreshPeers).toHaveBeenCalledTimes(1);
  });

  it("does not restart inbound polling when callback identities change while enabled", async () => {
    vi.useFakeTimers();
    const refreshPeers = vi.fn();
    const meetRtc = createMeetRtcStub();

    const { rerender } = renderHook(
      ({ onEnterInCall }) => {
        const peerInboundSampleRef = useRef(new Map());
        const peerMediaHintRef = useRef(new Map());
        useMeetInboundMediaHints({
          enabled: true,
          meetRtc,
          peerInboundSampleRef,
          peerMediaHintRef,
          refreshPeers,
          onEnterInCall,
        });
      },
      { initialProps: { onEnterInCall: () => {} } },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(refreshPeers).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 25; i++) {
      rerender({ onEnterInCall: () => {} });
    }

    await act(async () => {
      vi.advanceTimersByTime(650 * 2);
      await Promise.resolve();
    });
    expect(refreshPeers).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});
