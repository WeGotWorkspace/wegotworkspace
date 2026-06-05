import { useCallback, useMemo, useRef } from "react";
import type { HttpSignalingFetch, HttpSignalingPollResult } from "@/lib/rtc/signaling/http-client";
import type { RtcPeerDescriptor, RtcSettings } from "@/lib/rtc/types";
import { MeetRtcSession } from "@/meet-core/src/meet-rtc-session";

export type UseMeetRtcOptions = {
  rtcSettings: RtcSettings;
  signalingFetch?: HttpSignalingFetch;
  getLocalStream: () => MediaStream | null;
  onLinkChange: () => void;
  onPollData: (data: HttpSignalingPollResult) => void | Promise<void>;
  shouldConnectToPeer: (peer: RtcPeerDescriptor) => boolean;
  shouldHandleRtcSignals: () => boolean;
  onPeerRemoved: (remoteId: string, name: string, reason: "bye" | "roster") => void;
  onConnectionFailed: (remoteId: string, name: string) => void;
  onPollError: (error: unknown) => void;
  onPeerConnected: (remoteId: string) => void;
};

function createSession(options: UseMeetRtcOptions): MeetRtcSession {
  return new MeetRtcSession({
    rtcSettings: options.rtcSettings,
    fetchImpl: options.signalingFetch,
    getLocalStream: options.getLocalStream,
    onLinkChange: options.onLinkChange,
    onPollData: options.onPollData,
    shouldConnectToPeer: options.shouldConnectToPeer,
    shouldHandleRtcSignals: options.shouldHandleRtcSignals,
    onPeerRemoved: options.onPeerRemoved,
    onConnectionFailed: options.onConnectionFailed,
    onPollError: options.onPollError,
    onPeerConnected: options.onPeerConnected,
  });
}

export function useMeetRtc(options: UseMeetRtcOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sessionRef = useRef<MeetRtcSession | null>(null);

  const requireSession = useCallback(() => {
    if (!sessionRef.current) {
      throw new Error("Meet RTC session is not active");
    }
    return sessionRef.current;
  }, []);

  const join = useCallback(async (input: { room: string; peerId: string; name: string }) => {
    if (sessionRef.current) {
      await sessionRef.current.leave({ sendBye: false });
    }
    sessionRef.current = createSession(optionsRef.current);
    return sessionRef.current.join(input);
  }, []);

  const updateJoinName = useCallback(
    async (name: string) => {
      await requireSession().updateJoinName(name);
    },
    [requireSession],
  );

  const leave = useCallback(async (opts?: { sendBye?: boolean }) => {
    if (!sessionRef.current) return;
    await sessionRef.current.leave(opts);
    sessionRef.current = null;
  }, []);

  const replaceAudioTrack = useCallback(
    async (track: MediaStreamTrack) => {
      await requireSession().replaceAudioTrack(track);
    },
    [requireSession],
  );

  const replaceVideoTrack = useCallback(
    async (track: MediaStreamTrack) => {
      await requireSession().replaceVideoTrack(track);
    },
    [requireSession],
  );

  const getPeerConnection = useCallback(
    (remoteId: string) => sessionRef.current?.getPeerConnection(remoteId) ?? null,
    [],
  );

  const getRemoteStream = useCallback(
    (remoteId: string) => sessionRef.current?.getRemoteStream(remoteId) ?? null,
    [],
  );

  const getPeerIds = useCallback(() => sessionRef.current?.getPeerIds() ?? [], []);

  const getMyId = useCallback(() => sessionRef.current?.getMyId() ?? null, []);

  const getSessionKey = useCallback(() => sessionRef.current?.getSessionKey() ?? null, []);

  return useMemo(
    () => ({
      join,
      updateJoinName,
      leave,
      replaceAudioTrack,
      replaceVideoTrack,
      getPeerConnection,
      getRemoteStream,
      getPeerIds,
      getMyId,
      getSessionKey,
    }),
    [
      getMyId,
      getPeerConnection,
      getPeerIds,
      getRemoteStream,
      getSessionKey,
      join,
      leave,
      replaceAudioTrack,
      replaceVideoTrack,
      updateJoinName,
    ],
  );
}
