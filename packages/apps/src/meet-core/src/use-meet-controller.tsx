import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createWgwMeetGuestSignalingFetch } from "@/lib/api/wgw/meet";
import { parseUrlList } from "@/lib/rtc/config";
import { isRtcDebugEnabled } from "@/lib/rtc/debug";
import { rtcLog } from "@/lib/rtc/log";
import type { RtcPeerDescriptor } from "@/lib/rtc/types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import {
  buildMeetControlMessage,
  decodeMeetKnockerName,
  encodeMeetKnockerName,
} from "@/meet-core/src/meet-control-messages";
import { buildLocalMeetChatLine, type MeetChatLine } from "@/meet-core/src/meet-chat-line";
import type { PeerInboundSample } from "@/meet-core/src/meet-inbound-media-hints";
import { meetLabels } from "@/meet-core/src/meet-labels";
import type { MeetKnocker } from "@/meet-core/src/meet-poll-roster";
import { createMeetPeerId, createMeetRoomCode } from "@/meet-core/src/meet-room-id";
import type { MeetAPIOperations, MeetRtcSettings } from "@/meet-core/src/meet-types";
import { useMeetInboundMediaHints } from "@/meet-core/src/use-meet-inbound-media-hints";
import { useMeetLocalMedia } from "@/meet-core/src/use-meet-local-media";
import { useMeetPollHandler } from "@/meet-core/src/use-meet-poll-handler";
import { useMeetRtc } from "@/meet-core/src/use-meet-rtc";

type CallStatus = "idle" | "preparing" | "waiting" | "in-call" | "failed";

type RemotePeer = {
  id: string;
  name: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  /** Inbound RTP heuristics; null until a few polls after the peer is connected. */
  remoteMedia: { camera: boolean; mic: boolean } | null;
  /** Mic/camera intent from peer (control chat); null until the peer announces. */
  disclosedMedia: { camera: boolean; mic: boolean; screen?: boolean } | null;
};

type UseMeetControllerArgs = {
  session: WorkspaceSession;
  defaultDisplayName: string;
  rtc: MeetRtcSettings;
  operations?: MeetAPIOperations;
};

export function useMeetController({
  session,
  defaultDisplayName,
  rtc,
  operations,
}: UseMeetControllerArgs) {
  const rtcDebugEnabledRef = useRef(isRtcDebugEnabled());
  const debugRtc = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    rtcLog({ channel: "meet", peerId: selfIdRef.current }, event, payload);
  }, []);
  const canModerateKnocks = Boolean(session.user.username?.trim() || session.user.email?.trim());
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(
    defaultDisplayName || session.user.displayName || "Guest",
  );
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [chatMessages, setChatMessages] = useState<MeetChatLine[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [knockers, setKnockers] = useState<MeetKnocker[]>([]);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const participantRosterDiffReadyRef = useRef(false);
  const selfIdRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const displayNameRef = useRef(displayName);
  const operationsRef = useRef(operations);
  const waitingForAdmissionRef = useRef(false);
  const leaveRef = useRef<null | ((opts?: { preserveEndedMessage?: boolean }) => Promise<void>)>(
    null,
  );
  const rosterRef = useRef<Map<string, string>>(new Map());
  const peerInboundSampleRef = useRef<Map<string, PeerInboundSample>>(new Map());
  const peerMediaHintRef = useRef<Map<string, { camera: boolean; mic: boolean }>>(new Map());
  const peerDisclosedMediaRef = useRef<
    Map<string, { mic: boolean; camera: boolean; screen?: boolean }>
  >(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const micOnRef = useRef(micOn);
  const videoOnRef = useRef(videoOn);
  const screenOnRef = useRef(screenOn);

  operationsRef.current = operations;
  statusRef.current = status;
  displayNameRef.current = displayName;
  selfIdRef.current = selfId;
  roomCodeRef.current = roomCode;
  waitingForAdmissionRef.current = waitingForAdmission;
  micOnRef.current = micOn;
  videoOnRef.current = videoOn;
  screenOnRef.current = screenOn;

  const refreshPeersRef = useRef<() => void>(() => {});
  const announceMediaPresenceRef = useRef<
    (mic: boolean, camera: boolean, screen?: boolean) => Promise<void>
  >(async () => {});
  const meetRtcRef = useRef<ReturnType<typeof useMeetRtc> | null>(null);
  const getLocalStreamRef = useRef<() => MediaStream | null>(() => null);

  const handlePollData = useMeetPollHandler({
    selfIdRef,
    statusRef,
    roomCodeRef,
    displayNameRef,
    waitingForAdmissionRef,
    rosterRef,
    participantRosterDiffReadyRef,
    peerNamesRef,
    peerDisclosedMediaRef,
    refreshPeersRef,
    leaveRef,
    meetRtcRef,
    setKnockers,
    setEndedMessage,
    setStatus,
    setStartedAt,
    setWaitingForAdmission,
    setChatMessages,
  });

  const isGuestSession = !session.user.username?.trim() && !session.user.email?.trim();
  const guestSignalingFetch = useMemo(
    () => (isGuestSession ? createWgwMeetGuestSignalingFetch() : undefined),
    [isGuestSession],
  );

  const meetRtc = useMeetRtc({
    rtcSettings: rtc,
    signalingFetch: guestSignalingFetch,
    getLocalStream: () => getLocalStreamRef.current(),
    onLinkChange: () => refreshPeersRef.current(),
    onPollData: handlePollData,
    shouldConnectToPeer: (peer: RtcPeerDescriptor) =>
      !decodeMeetKnockerName(peer.name) && !waitingForAdmissionRef.current,
    shouldHandleRtcSignals: () => !waitingForAdmissionRef.current,
    onPeerRemoved: (peerId, name) => {
      peerNamesRef.current.delete(peerId);
      peerInboundSampleRef.current.delete(peerId);
      peerMediaHintRef.current.delete(peerId);
      peerDisclosedMediaRef.current.delete(peerId);
      refreshPeersRef.current();
      if (statusRef.current === "in-call" && peerId !== selfIdRef.current && selfIdRef.current) {
        toast.info(meetLabels.participantLeft(name));
      }
    },
    onConnectionFailed: (_peerId, peerName) => {
      setError(`Connection to ${peerName} failed.`);
    },
    onPollError: (error) => {
      const message = error instanceof Error ? error.message : "Could not poll room updates.";
      debugRtc("poll-failed", { message });
      setError(message);
    },
    onPeerConnected: () => {
      void announceMediaPresenceRef.current(micOnRef.current, videoOnRef.current);
    },
  });
  meetRtcRef.current = meetRtc;

  useEffect(() => {
    debugRtc("controller-init", {
      rtcDebugEnabled: rtcDebugEnabledRef.current,
      stunCount: parseUrlList(rtc.stunUrls, "stun").length,
      turnCount: parseUrlList(rtc.turnUrls, "turn").length,
      forceRelay: rtc.forceRelay,
      turnUsernameConfigured: rtc.turnUsername.trim() !== "",
      turnPasswordConfigured: rtc.turnPassword.trim() !== "",
    });
  }, [debugRtc, rtc]);

  const refreshPeers = useCallback(() => {
    const next: RemotePeer[] = [];
    for (const id of meetRtc.getPeerIds()) {
      const pc = meetRtc.getPeerConnection(id);
      const name = peerNamesRef.current.get(id) ?? "Peer";
      const stream = meetRtc.getRemoteStream(id);
      const connectionState = pc?.connectionState ?? "new";
      const connected = connectionState === "connected";
      next.push({
        id,
        name,
        stream,
        connectionState,
        remoteMedia: connected ? (peerMediaHintRef.current.get(id) ?? null) : null,
        disclosedMedia: peerDisclosedMediaRef.current.get(id) ?? null,
      });
    }
    setPeers(next);
  }, [meetRtc]);
  refreshPeersRef.current = refreshPeers;

  const announceMediaPresence = useCallback(
    async (mic: boolean, camera: boolean, screen?: boolean) => {
      if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
      if (statusRef.current !== "in-call") return;
      const screenOnNow = screen ?? screenOnRef.current;
      try {
        await operationsRef.current.chat({
          room: roomCodeRef.current,
          from: selfIdRef.current,
          text: buildMeetControlMessage({
            kind: "media",
            mic,
            camera,
            screen: screenOnNow,
          }),
          sessionKey: meetRtc.getSessionKey() ?? undefined,
        });
      } catch {
        // Best-effort; peers may still infer from tracks or RTP stats.
      }
    },
    [meetRtc],
  );
  announceMediaPresenceRef.current = announceMediaPresence;

  const {
    localVideoRef,
    screenPreviewStream,
    audioInputs,
    videoInputs,
    selectedMicId,
    selectedCamId,
    ensureLocalMedia,
    stopLocalMedia,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    switchMic,
    switchCamera,
    getLocalStream,
  } = useMeetLocalMedia({
    meetRtc,
    micOn,
    videoOn,
    screenOn,
    setMicOn,
    setVideoOn,
    setScreenOn,
    setError,
    announceMediaPresence,
    micOnRef,
    videoOnRef,
    screenOnRef,
  });
  getLocalStreamRef.current = getLocalStream;

  const announceMediaPresenceEnterInCall = useCallback(() => {
    void announceMediaPresence(micOnRef.current, videoOnRef.current);
  }, [announceMediaPresence]);

  useMeetInboundMediaHints({
    enabled: status === "in-call",
    meetRtc,
    peerInboundSampleRef,
    peerMediaHintRef,
    refreshPeers,
    onEnterInCall: announceMediaPresenceEnterInCall,
  });

  useEffect(() => {
    if (status === "in-call") return;
    peerDisclosedMediaRef.current.clear();
    refreshPeersRef.current();
  }, [status]);

  const joinRoom = useCallback(
    async (room?: string) => {
      const target = (room ?? createMeetRoomCode()).trim().toLowerCase();
      const peerId = createMeetPeerId(10);
      setError(null);
      setStatus("preparing");
      setRoomCode(target);
      setSelfId(peerId);
      selfIdRef.current = peerId;
      roomCodeRef.current = target;
      setChatMessages([]);
      setWaitingForAdmission(false);
      setKnockers([]);
      setEndedMessage(null);
      rosterRef.current = new Map();
      peerNamesRef.current = new Map();
      participantRosterDiffReadyRef.current = false;

      try {
        debugRtc("join-room-start", { room: target, peerId });
        await ensureLocalMedia();
        await meetRtc.join({
          room: target,
          peerId,
          name: displayNameRef.current.trim() || "Guest",
        });
        setStatus("in-call");
        setStartedAt(Date.now());
        debugRtc("join-room-success", { room: target, peerId });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not join meeting.";
        debugRtc("join-room-failed", { room: target, peerId, message });
        setStatus("failed");
        setError(message);
        throw e;
      }
    },
    [ensureLocalMedia, meetRtc],
  );

  const leave = useCallback(
    async (opts?: { preserveEndedMessage?: boolean }) => {
      await meetRtc.leave();
      stopLocalMedia();

      setStatus("idle");
      setRoomCode(null);
      setSelfId(null);
      setStartedAt(null);
      setElapsedSeconds(0);
      setScreenOn(false);
      setMicOn(true);
      setVideoOn(true);
      setPeers([]);
      setChatMessages([]);
      setWaitingForAdmission(false);
      setKnockers([]);
      if (!opts?.preserveEndedMessage) {
        setEndedMessage(null);
      }
      rosterRef.current = new Map();
      participantRosterDiffReadyRef.current = false;
      roomCodeRef.current = null;
      selfIdRef.current = null;
      peerDisclosedMediaRef.current.clear();
      peerNamesRef.current.clear();
    },
    [meetRtc, stopLocalMedia],
  );
  leaveRef.current = leave;

  const sendLeaveBeacon = useCallback(() => {
    const room = roomCodeRef.current;
    const peerId = selfIdRef.current;
    if (!room || !peerId) return;
    const payload = JSON.stringify({
      room,
      peerId,
      sessionKey: meetRtc.getSessionKey() ?? undefined,
    });
    const endpoint = "/api/v1/meet/leave";
    let sent = false;
    try {
      if (typeof navigator.sendBeacon === "function") {
        sent = navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
      }
    } catch {
      sent = false;
    }
    if (sent) return;
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // Ignore best-effort unload failures.
    });
  }, [meetRtc]);

  const requestJoin = useCallback(
    async (room: string) => {
      const target = room.trim().toLowerCase();
      if (!target) return;
      const peerId = createMeetPeerId(10);
      setError(null);
      setStatus("preparing");
      setRoomCode(target);
      setSelfId(peerId);
      selfIdRef.current = peerId;
      roomCodeRef.current = target;
      setChatMessages([]);
      setWaitingForAdmission(true);
      setKnockers([]);
      setEndedMessage(null);
      rosterRef.current = new Map();
      peerNamesRef.current = new Map();
      participantRosterDiffReadyRef.current = false;

      try {
        await ensureLocalMedia();
        await meetRtc.join({
          room: target,
          peerId,
          name: encodeMeetKnockerName(displayNameRef.current),
        });
        if (operationsRef.current) {
          await operationsRef.current.chat({
            room: target,
            from: peerId,
            text: buildMeetControlMessage({
              kind: "knock",
              peerId,
              name: displayNameRef.current.trim() || "Guest",
            }),
            sessionKey: meetRtc.getSessionKey() ?? undefined,
          });
        }
        setStatus("waiting");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not request to join.";
        setStatus("failed");
        setError(message);
        setWaitingForAdmission(false);
        throw e;
      }
    },
    [ensureLocalMedia, meetRtc],
  );

  const admitKnocker = useCallback(
    async (peerId: string) => {
      if (!canModerateKnocks) return;
      if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
      await operationsRef.current.chat({
        room: roomCodeRef.current,
        from: selfIdRef.current,
        text: buildMeetControlMessage({ kind: "admit", peerId }),
        sessionKey: meetRtc.getSessionKey() ?? undefined,
      });
      setKnockers((prev) => prev.filter((entry) => entry.id !== peerId));
    },
    [canModerateKnocks],
  );

  const denyKnocker = useCallback(
    async (peerId: string) => {
      if (!canModerateKnocks) return;
      if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
      await operationsRef.current.chat({
        room: roomCodeRef.current,
        from: selfIdRef.current,
        text: buildMeetControlMessage({ kind: "deny", peerId }),
        sessionKey: meetRtc.getSessionKey() ?? undefined,
      });
      setKnockers((prev) => prev.filter((entry) => entry.id !== peerId));
    },
    [canModerateKnocks],
  );

  const endCallForAll = useCallback(async () => {
    if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) {
      await leave();
      return;
    }
    try {
      await operationsRef.current.chat({
        room: roomCodeRef.current,
        from: selfIdRef.current,
        text: buildMeetControlMessage({
          kind: "end",
          by: displayNameRef.current.trim() || "Host",
        }),
        sessionKey: meetRtc.getSessionKey() ?? undefined,
      });
    } catch {
      // Continue with local leave even if broadcast fails.
    }
    await leave();
  }, [leave]);

  const sendChat = useCallback(async (body: string) => {
    const text = body.trim();
    if (!text) return;
    const me = selfIdRef.current;
    if (!me || !roomCodeRef.current) return;

    const localLine = buildLocalMeetChatLine(me, displayNameRef.current.trim() || "You", text);
    setChatMessages((prev) => [...prev, localLine]);

    if (!operationsRef.current) return;
    try {
      await operationsRef.current.chat({
        room: roomCodeRef.current,
        from: me,
        text,
        sessionKey: meetRtc.getSessionKey() ?? undefined,
      });
    } catch (e) {
      setChatMessages((prev) => prev.filter((line) => line.id !== localLine.id));
      toast.error(e instanceof Error ? e.message : "Could not send message.");
    }
  }, []);

  useEffect(() => {
    return () => {
      void leave();
    };
  }, [leave]);

  useEffect(() => {
    const isMeetingActive = status === "in-call" || status === "preparing" || status === "waiting";
    if (!isMeetingActive) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  useEffect(() => {
    const onPageHide = () => {
      const active = statusRef.current === "in-call" || statusRef.current === "waiting";
      if (!active) return;
      sendLeaveBeacon();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [sendLeaveBeacon]);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const callLink = useMemo(() => {
    if (!roomCode || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (/\/meet\/guest\/?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/meet\/guest\/?$/, "/meet/guest");
    } else if (/\/meet\/?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/meet\/?$/, "/meet/guest");
    } else {
      url.pathname = "/meet/guest";
    }
    url.searchParams.set("room", roomCode);
    return url.toString();
  }, [roomCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomCode) return;
    const next = new URL(window.location.href);
    next.searchParams.set("room", roomCode);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextUrl = `${next.pathname}${next.search}${next.hash}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [roomCode]);

  useEffect(() => {
    const node = localVideoRef.current;
    if (!node) return;
    const stream = getLocalStream();
    node.srcObject = stream;
  }, [getLocalStream, videoOn, screenOn, status]);

  const startMeeting = useCallback(async () => {
    await joinRoom();
  }, [joinRoom]);

  const elapsedLabel = useMemo(() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, [elapsedSeconds]);

  return {
    status,
    error,
    roomCode,
    selfId,
    displayName,
    setDisplayName,
    micOn,
    videoOn,
    screenOn,
    screenPreviewStream,
    startedAt,
    elapsedLabel,
    peers,
    knockers,
    waitingForAdmission,
    endedMessage,
    chatMessages,
    localVideoRef,
    audioInputs,
    videoInputs,
    selectedMicId,
    selectedCamId,
    ensureLocalMedia,
    startMeeting,
    joinRoom,
    requestJoin,
    admitKnocker,
    denyKnocker,
    endCallForAll,
    leave,
    sendChat,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    switchMic,
    switchCamera,
    callLink,
    inCall: status === "in-call" || status === "preparing",
  };
}
