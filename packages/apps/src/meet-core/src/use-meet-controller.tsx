import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createWgwMeetGuestSignalingFetch } from "@/lib/api/wgw/meet";
import { parseUrlList } from "@/lib/rtc/config";
import { isRtcDebugEnabled } from "@/lib/rtc/debug";
import type { HttpSignalingPollResult } from "@/lib/rtc/signaling/http-client";
import { rtcLog } from "@/lib/rtc/log";
import type { RtcPeerDescriptor } from "@/lib/rtc/types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import {
  buildMeetControlMessage,
  decodeMeetKnockerName,
  encodeMeetKnockerName,
  parseMeetControlMessage,
} from "@/meet-core/src/meet-control-messages";
import type { PeerInboundSample } from "@/meet-core/src/meet-inbound-media-hints";
import { meetLabels } from "@/meet-core/src/meet-labels";
import {
  buildActiveMeetRoster,
  listKnockersFromRoster,
  listNewParticipantNames,
  type MeetKnocker,
} from "@/meet-core/src/meet-poll-roster";
import type { MeetAPIOperations, MeetRtcSettings } from "@/meet-core/src/meet-types";
import { useMeetInboundMediaHints } from "@/meet-core/src/use-meet-inbound-media-hints";
import { useMeetRtc } from "@/meet-core/src/use-meet-rtc";

type SignalType = "offer" | "answer" | "ice" | "bye" | "chat";
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

type ChatLine = {
  id: string;
  fromPeerId: string;
  fromName: string;
  body: string;
  ts: number;
  isSelf: boolean;
};

function randomId(len = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(len);
  crypto.getRandomValues(values);
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[values[i]! % alphabet.length];
  }
  return out;
}

function randomRoom(): string {
  const id = randomId(12);
  return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}`.toLowerCase();
}

function buildAudioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };
}

function buildVideoConstraints(deviceId?: string): MediaTrackConstraints {
  return deviceId
    ? { width: { ideal: 1280 }, height: { ideal: 720 }, deviceId: { exact: deviceId } }
    : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };
}

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
  const [screenPreviewStream, setScreenPreviewStream] = useState<MediaStream | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatLine[]>([]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [knockers, setKnockers] = useState<MeetKnocker[]>([]);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
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

  const handlePollData = useCallback(async (poll: HttpSignalingPollResult) => {
    const roster = poll.peers ?? [];
    const incoming = (poll.messages ?? []) as Array<{
      from: string;
      type: SignalType;
      payload: unknown;
    }>;
    const selfPeerId = selfIdRef.current;
    if (!selfPeerId) return;

    const pendingKnockers = listKnockersFromRoster(roster);
    setKnockers(pendingKnockers);
    const pendingKnockerIds = new Set(pendingKnockers.map((peer) => peer.id));
    const activeRoster = buildActiveMeetRoster(roster, pendingKnockerIds);
    for (const [id, name] of activeRoster) {
      peerNamesRef.current.set(id, name);
    }
    if (statusRef.current === "in-call") {
      if (!participantRosterDiffReadyRef.current) {
        participantRosterDiffReadyRef.current = true;
        rosterRef.current = activeRoster;
      } else {
        for (const name of listNewParticipantNames(rosterRef.current, activeRoster, selfPeerId)) {
          toast.success(meetLabels.participantJoined(name));
        }
        rosterRef.current = activeRoster;
      }
    } else {
      rosterRef.current = activeRoster;
    }

    for (const msg of incoming) {
      if (msg.type !== "chat") continue;
      const text = (msg.payload as { text?: unknown } | null)?.text;
      if (typeof text !== "string" || text.trim() === "") continue;
      const control = parseMeetControlMessage(text.trim());
      if (control) {
        if (control.kind === "knock") {
          setKnockers((prev) => {
            if (prev.some((entry) => entry.id === control.peerId)) return prev;
            return [...prev, { id: control.peerId, name: control.name }];
          });
        }
        if (control.kind === "end") {
          if (statusRef.current === "in-call") {
            setEndedMessage(`Call ended by ${control.by}.`);
            toast.info(`Call ended by ${control.by}.`);
            await leaveRef.current?.({ preserveEndedMessage: true });
          }
          continue;
        }
        if (control.kind === "media") {
          if (msg.from !== selfPeerId) {
            peerDisclosedMediaRef.current.set(msg.from, {
              mic: control.mic,
              camera: control.camera,
              screen: control.screen,
            });
            refreshPeersRef.current();
          }
          continue;
        }
        if (control.kind !== "admit" && control.kind !== "deny") continue;
        if (control.peerId !== selfPeerId) continue;
        if (control.kind === "admit") {
          if (waitingForAdmissionRef.current && roomCodeRef.current && selfPeerId) {
            await meetRtcRef.current?.updateJoinName(displayNameRef.current.trim() || "Guest");
            setWaitingForAdmission(false);
            setStatus("in-call");
            setStartedAt(Date.now());
            toast.success("You were let in.");
          }
        } else if (control.kind === "deny") {
          toast.error("The host denied your request to join.");
          await leaveRef.current?.();
        }
        continue;
      }
      const fromName = roster.find((peer) => peer.id === msg.from)?.name ?? "Peer";
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${msg.from}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          fromPeerId: msg.from,
          fromName,
          body: text.trim(),
          ts: Date.now(),
          isSelf: msg.from === selfPeerId,
        },
      ]);
    }
  }, []);

  const isGuestSession = !session.user.username?.trim() && !session.user.email?.trim();
  const guestSignalingFetch = useMemo(
    () => (isGuestSession ? createWgwMeetGuestSignalingFetch() : undefined),
    [isGuestSession],
  );

  const meetRtc = useMeetRtc({
    rtcSettings: rtc,
    signalingFetch: guestSignalingFetch,
    getLocalStream: () => localStreamRef.current,
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

  const refreshDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
      setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      // Ignore read failures from unsupported browsers.
    }
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(selectedMicId ?? undefined),
      video: buildVideoConstraints(selectedCamId ?? undefined),
    });
    localStreamRef.current = stream;
    cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoOn;
    });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    await refreshDeviceList();
    return stream;
  }, [micOn, refreshDeviceList, selectedCamId, selectedMicId, videoOn]);

  const replaceAudioTrackOnAllPeers = useCallback(
    async (track: MediaStreamTrack) => {
      await meetRtc.replaceAudioTrack(track);
    },
    [meetRtc],
  );

  const replaceVideoTrackOnAllPeers = useCallback(
    async (track: MediaStreamTrack) => {
      await meetRtc.replaceVideoTrack(track);
    },
    [meetRtc],
  );

  useMeetInboundMediaHints({
    enabled: status === "in-call",
    meetRtc,
    peerInboundSampleRef,
    peerMediaHintRef,
    refreshPeers,
    onEnterInCall: () => {
      void announceMediaPresence(micOnRef.current, videoOnRef.current);
    },
  });

  useEffect(() => {
    if (status === "in-call") return;
    peerDisclosedMediaRef.current.clear();
    refreshPeers();
  }, [status, refreshPeers]);

  const joinRoom = useCallback(
    async (room?: string) => {
      const target = (room ?? randomRoom()).trim().toLowerCase();
      const peerId = randomId(10);
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
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      screenStreamRef.current = null;
      setScreenPreviewStream(null);
      cameraTrackRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;

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
    [meetRtc],
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
      const peerId = randomId(10);
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

    const localLine: ChatLine = {
      id: `me-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      fromPeerId: me,
      fromName: displayNameRef.current.trim() || "You",
      body: text,
      ts: Date.now(),
      isSelf: true,
    };
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

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      void announceMediaPresence(next, videoOnRef.current);
      return next;
    });
  }, [announceMediaPresence]);

  const toggleVideo = useCallback(() => {
    setVideoOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      void announceMediaPresence(micOnRef.current, next);
      return next;
    });
  }, [announceMediaPresence]);

  const toggleScreenShare = useCallback(async () => {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenPreviewStream(null);
      const cameraTrack = cameraTrackRef.current;
      if (cameraTrack) await replaceVideoTrackOnAllPeers(cameraTrack);
      setScreenOn(false);
      void announceMediaPresence(micOnRef.current, videoOnRef.current, false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setScreenPreviewStream(stream);
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      await replaceVideoTrackOnAllPeers(track);
      track.onended = () => {
        void (async () => {
          if (!screenStreamRef.current) return;
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          setScreenPreviewStream(null);
          const cameraTrack = cameraTrackRef.current;
          if (cameraTrack) await replaceVideoTrackOnAllPeers(cameraTrack);
          setScreenOn(false);
          void announceMediaPresence(micOnRef.current, videoOnRef.current, false);
        })();
      };
      setScreenOn(true);
      void announceMediaPresence(micOnRef.current, videoOnRef.current, true);
    } catch {
      // User canceled picker.
    }
  }, [announceMediaPresence, replaceVideoTrackOnAllPeers, screenOn]);

  const switchMic = useCallback(
    async (deviceId: string) => {
      setSelectedMicId(deviceId);
      const stream = localStreamRef.current;
      if (!stream) return;
      try {
        const updated = await navigator.mediaDevices.getUserMedia({
          audio: buildAudioConstraints(deviceId),
          video: false,
        });
        const track = updated.getAudioTracks()[0];
        if (!track) return;
        track.enabled = micOn;
        const previous = stream.getAudioTracks()[0];
        if (previous && previous.id !== track.id) {
          stream.removeTrack(previous);
          previous.stop();
        }
        if (!stream.getAudioTracks().includes(track)) stream.addTrack(track);
        await replaceAudioTrackOnAllPeers(track);
        await refreshDeviceList();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not switch microphone.");
      }
    },
    [micOn, refreshDeviceList, replaceAudioTrackOnAllPeers],
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedCamId(deviceId);
      const stream = localStreamRef.current;
      if (!stream) return;
      try {
        const updated = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: buildVideoConstraints(deviceId),
        });
        const track = updated.getVideoTracks()[0];
        if (!track) return;
        track.enabled = videoOn;
        const previous = stream.getVideoTracks()[0];
        if (previous && previous.id !== track.id) {
          stream.removeTrack(previous);
          previous.stop();
        }
        if (!stream.getVideoTracks().includes(track)) stream.addTrack(track);
        cameraTrackRef.current = track;
        if (!screenOn) {
          await replaceVideoTrackOnAllPeers(track);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }
        await refreshDeviceList();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not switch camera.");
      }
    },
    [refreshDeviceList, replaceVideoTrackOnAllPeers, screenOn, videoOn],
  );

  useEffect(() => {
    void refreshDeviceList();
    const media = navigator.mediaDevices;
    if (!media) return;
    const onDeviceChange = () => void refreshDeviceList();
    media.addEventListener("devicechange", onDeviceChange);
    return () => media.removeEventListener("devicechange", onDeviceChange);
  }, [refreshDeviceList]);

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
    if (localStreamRef.current) {
      node.srcObject = localStreamRef.current;
      return;
    }
    node.srcObject = null;
  }, [videoOn, screenOn, status]);

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
