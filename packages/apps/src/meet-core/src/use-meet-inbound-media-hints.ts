import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import {
  advancePeerInboundSample,
  type PeerInboundSample,
} from "@/meet-core/src/meet-inbound-media-hints";
import { readInboundMediaTotals } from "@/meet-core/src/meet-inbound-media-stats";
import type { useMeetRtc } from "@/meet-core/src/use-meet-rtc";

type MeetRtc = ReturnType<typeof useMeetRtc>;

type UseMeetInboundMediaHintsArgs = {
  enabled: boolean;
  meetRtc: MeetRtc;
  peerInboundSampleRef: RefObject<Map<string, PeerInboundSample>>;
  peerMediaHintRef: RefObject<Map<string, { camera: boolean; mic: boolean }>>;
  refreshPeers: () => void;
  onEnterInCall: () => void;
};

export function useMeetInboundMediaHints({
  enabled,
  meetRtc,
  peerInboundSampleRef,
  peerMediaHintRef,
  refreshPeers,
  onEnterInCall,
}: UseMeetInboundMediaHintsArgs) {
  const refreshPeersRef = useRef(refreshPeers);
  const onEnterInCallRef = useRef(onEnterInCall);
  refreshPeersRef.current = refreshPeers;
  onEnterInCallRef.current = onEnterInCall;

  useEffect(() => {
    if (!enabled) {
      peerInboundSampleRef.current.clear();
      peerMediaHintRef.current.clear();
      refreshPeersRef.current();
      return;
    }

    onEnterInCallRef.current();
    let cancelled = false;

    const sampleTick = async () => {
      if (cancelled) return;
      const peerIds = meetRtc.getPeerIds();
      await Promise.all(
        peerIds.map(async (id) => {
          const pc = meetRtc.getPeerConnection(id);
          if (!pc || pc.connectionState !== "connected") {
            peerInboundSampleRef.current.delete(id);
            peerMediaHintRef.current.delete(id);
            return;
          }
          try {
            const totals = await readInboundMediaTotals(pc);
            const result = advancePeerInboundSample(
              peerInboundSampleRef.current.get(id),
              totals,
              Date.now(),
            );
            if (result.kind === "too-soon") return;
            peerInboundSampleRef.current.set(id, result.sample);
            if (result.mediaHint) {
              peerMediaHintRef.current.set(id, result.mediaHint);
            } else {
              peerMediaHintRef.current.delete(id);
            }
          } catch {
            // Ignore stats read failures.
          }
        }),
      );
      refreshPeersRef.current();
    };

    const intervalId = window.setInterval(() => {
      void sampleTick();
    }, 650);
    void sampleTick();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, meetRtc, peerInboundSampleRef, peerMediaHintRef]);
}
