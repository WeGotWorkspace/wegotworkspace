import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { MeetAPIOperations, MeetRtcSettings } from "@/meet-core/src/meet-types";

type SignalType = "offer" | "answer" | "ice" | "bye" | "chat";
type IceMode = "direct" | "relay";
type CallStatus = "idle" | "preparing" | "waiting" | "in-call" | "failed";

type RemotePeer = {
  id: string;
  name: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
};

type ChatLine = {
  id: string;
  fromPeerId: string;
  fromName: string;
  body: string;
  ts: number;
  isSelf: boolean;
};

type Knocker = {
  id: string;
  name: string;
};

type PeerEntry = {
  pc: RTCPeerConnection;
  name: string;
  stream: MediaStream;
  mode: IceMode;
  relayFallbackTried: boolean;
  pendingIce: RTCIceCandidateInit[];
};

type ControlMessage =
  | { kind: "knock"; peerId: string; name: string }
  | { kind: "admit"; peerId: string }
  | { kind: "deny"; peerId: string }
  | { kind: "end"; by: string };

const KNOCK_NAME_PREFIX = "__wgw_knock__:";
const CONTROL_PREFIX = "__wgw_meet_control__:";

const EU_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.nextcloud.com:443" },
  { urls: "stun:stun.sipgate.net:3478" },
  { urls: "stun:stun.1und1.de:3478" },
  { urls: "stun:stun.t-online.de:3478" },
];

const SIGNAL_ORDER: Record<SignalType, number> = {
  offer: 0,
  answer: 1,
  ice: 2,
  bye: 3,
  chat: 4,
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

function parseUrlList(raw: string): string[] {
  return raw
    .split(/[\n,\r]+/)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

function toRtcConfig(settings: MeetRtcSettings, mode: IceMode): RTCConfiguration {
  const forceRelay = settings.forceRelay || mode === "relay";
  const turnUrls = parseUrlList(settings.turnUrls);
  const stunUrls = parseUrlList(settings.stunUrls);

  const iceServers: RTCIceServer[] = [];
  if (forceRelay) {
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username: settings.turnUsername || undefined,
        credential: settings.turnPassword || undefined,
      });
    } else {
      iceServers.push(...EU_STUN_SERVERS.slice(0, 2));
    }
  } else if (stunUrls.length > 0) {
    iceServers.push({ urls: [...new Set(stunUrls)] });
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username: settings.turnUsername || undefined,
        credential: settings.turnPassword || undefined,
      });
    }
  } else {
    iceServers.push(...EU_STUN_SERVERS);
  }

  return {
    iceServers,
    iceTransportPolicy: forceRelay ? "relay" : "all",
    iceCandidatePoolSize: forceRelay ? 0 : 4,
  };
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

function sortSignalMessages(messages: Array<{ from: string; type: SignalType; payload: unknown }>) {
  return [...messages].sort((a, b) => {
    const aRank = SIGNAL_ORDER[a.type];
    const bRank = SIGNAL_ORDER[b.type];
    if (aRank !== bRank) return aRank - bRank;
    return a.from.localeCompare(b.from);
  });
}

function encodeKnockerName(displayName: string): string {
  const safeName = displayName.trim() || "Guest";
  return `${KNOCK_NAME_PREFIX}${safeName}`;
}

function decodeKnockerName(peerName: string): string | null {
  if (!peerName.startsWith(KNOCK_NAME_PREFIX)) return null;
  const name = peerName.slice(KNOCK_NAME_PREFIX.length).trim();
  return name === "" ? "Guest" : name;
}

function buildControlMessage(payload: ControlMessage): string {
  return `${CONTROL_PREFIX}${JSON.stringify(payload)}`;
}

function parseControlMessage(text: string): ControlMessage | null {
  if (!text.startsWith(CONTROL_PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(CONTROL_PREFIX.length)) as Record<string, unknown>;
    if (
      parsed.kind === "knock" &&
      typeof parsed.peerId === "string" &&
      typeof parsed.name === "string"
    ) {
      return { kind: "knock", peerId: parsed.peerId, name: parsed.name };
    }
    if ((parsed.kind === "admit" || parsed.kind === "deny") && typeof parsed.peerId === "string") {
      return { kind: parsed.kind, peerId: parsed.peerId };
    }
    if (parsed.kind === "end" && typeof parsed.by === "string") {
      return { kind: "end", by: parsed.by };
    }
  } catch {
    return null;
  }
  return null;
}

function toSessionDescription(
  payload: unknown,
  fallbackType: RTCSdpType,
): RTCSessionDescriptionInit | null {
  const raw = payload as { sdp?: unknown; type?: unknown } | null;
  if (!raw || typeof raw.sdp !== "string" || raw.sdp.trim() === "") return null;
  const type = raw.type;
  const normalizedType: RTCSdpType =
    type === "offer" || type === "answer" || type === "pranswer" || type === "rollback"
      ? type
      : fallbackType;
  return { type: normalizedType, sdp: raw.sdp };
}

async function flushPendingIce(entry: PeerEntry): Promise<void> {
  while (entry.pendingIce.length > 0) {
    const candidate = entry.pendingIce.shift();
    if (!candidate) continue;
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch {
      // Ignore invalid queued candidates.
    }
  }
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
  const [knockers, setKnockers] = useState<Knocker[]>([]);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const pollTimerRef = useRef<number | null>(null);
  const joinedSessionKeyRef = useRef<string | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const displayNameRef = useRef(displayName);
  const operationsRef = useRef(operations);
  const waitingForAdmissionRef = useRef(false);
  const leaveRef = useRef<null | (() => Promise<void>)>(null);
  const rosterRef = useRef<Map<string, string>>(new Map());

  operationsRef.current = operations;
  statusRef.current = status;
  displayNameRef.current = displayName;
  selfIdRef.current = selfId;
  roomCodeRef.current = roomCode;
  waitingForAdmissionRef.current = waitingForAdmission;

  const refreshPeers = useCallback(() => {
    const next: RemotePeer[] = [];
    peersRef.current.forEach((entry, id) => {
      next.push({
        id,
        name: entry.name,
        stream: entry.stream,
        connectionState: entry.pc.connectionState,
      });
    });
    setPeers(next);
  }, []);

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

  const replaceAudioTrackOnAllPeers = useCallback(async (track: MediaStreamTrack) => {
    const updates: Promise<void>[] = [];
    peersRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "audio");
      if (!sender) return;
      updates.push(sender.replaceTrack(track));
    });
    await Promise.all(updates);
  }, []);

  const replaceVideoTrackOnAllPeers = useCallback(async (track: MediaStreamTrack) => {
    const updates: Promise<void>[] = [];
    peersRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) return;
      updates.push(sender.replaceTrack(track));
    });
    await Promise.all(updates);
  }, []);

  const closePeer = useCallback(
    (peerId: string) => {
      const entry = peersRef.current.get(peerId);
      if (!entry) return;
      entry.pc.close();
      entry.stream.getTracks().forEach((track) => track.stop());
      peersRef.current.delete(peerId);
      refreshPeers();
    },
    [refreshPeers],
  );

  const createPeerConnection = useCallback(
    (peerId: string, peerName: string, mode: IceMode = "direct"): PeerEntry => {
      const pc = new RTCPeerConnection(toRtcConfig(rtc, mode));
      const remoteStream = new MediaStream();

      const entry: PeerEntry = {
        pc,
        name: peerName,
        stream: remoteStream,
        mode,
        relayFallbackTried: false,
        pendingIce: [],
      };
      peersRef.current.set(peerId, entry);

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStreamRef.current!));
      }

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (!remoteStream.getTracks().includes(track)) {
            remoteStream.addTrack(track);
          }
        });
        refreshPeers();
      };

      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.toJSON();
        if (
          !candidate ||
          typeof candidate.candidate !== "string" ||
          candidate.candidate.trim() === "" ||
          !operationsRef.current ||
          !roomCodeRef.current ||
          !selfIdRef.current
        ) {
          return;
        }
        void operationsRef.current.send({
          room: roomCodeRef.current,
          from: selfIdRef.current,
          to: peerId,
          type: "ice",
          payload: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
            usernameFragment: candidate.usernameFragment ?? undefined,
          },
          sessionKey: joinedSessionKeyRef.current ?? undefined,
        });
      };

      pc.onconnectionstatechange = () => {
        refreshPeers();
        if (pc.connectionState !== "failed") return;
        if (entry.mode === "relay" || entry.relayFallbackTried) {
          setError(`Connection to ${peerName} failed.`);
          return;
        }
        entry.relayFallbackTried = true;
        entry.mode = "relay";
        try {
          pc.setConfiguration(toRtcConfig(rtc, "relay"));
          pc.restartIce();
          if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
          void (async () => {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            if (!pc.localDescription?.sdp) return;
            await operationsRef.current?.send({
              room: roomCodeRef.current!,
              from: selfIdRef.current!,
              to: peerId,
              type: "offer",
              payload: { sdp: pc.localDescription.sdp, type: pc.localDescription.type },
              sessionKey: joinedSessionKeyRef.current ?? undefined,
            });
          })();
        } catch {
          setError(`Connection to ${peerName} failed.`);
        }
      };

      return entry;
    },
    [refreshPeers, rtc],
  );

  const handleSignal = useCallback(
    async (message: { from: string; type: SignalType; payload: unknown }, peerName: string) => {
      if (message.type === "chat") return;
      const { from, type, payload } = message;
      let entry = peersRef.current.get(from);

      if (type === "offer") {
        if (!entry) {
          entry = createPeerConnection(from, peerName, rtc.forceRelay ? "relay" : "direct");
        }
        const sdp = toSessionDescription(payload, "offer");
        if (!sdp) return;
        if (entry.pc.signalingState !== "stable") {
          try {
            await entry.pc.setLocalDescription({ type: "rollback" });
          } catch {
            // Ignore rollback failures on incompatible states.
          }
        }
        await entry.pc.setRemoteDescription(sdp);
        await flushPendingIce(entry);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        if (!entry.pc.localDescription?.sdp) return;
        if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
        await operationsRef.current.send({
          room: roomCodeRef.current,
          from: selfIdRef.current,
          to: from,
          type: "answer",
          payload: {
            sdp: entry.pc.localDescription.sdp,
            type: entry.pc.localDescription.type,
          },
          sessionKey: joinedSessionKeyRef.current ?? undefined,
        });
        return;
      }

      if (type === "answer" && entry) {
        const sdp = toSessionDescription(payload, "answer");
        if (!sdp) return;
        if (entry.pc.signalingState !== "stable") {
          await entry.pc.setRemoteDescription(sdp);
          await flushPendingIce(entry);
        }
        return;
      }

      if (type === "ice" && entry) {
        const candidate = payload as RTCIceCandidateInit | null;
        if (
          !candidate ||
          typeof candidate.candidate !== "string" ||
          candidate.candidate.trim() === ""
        ) {
          return;
        }
        if (!entry.pc.remoteDescription) {
          entry.pendingIce.push(candidate);
          return;
        }
        try {
          await entry.pc.addIceCandidate(candidate);
        } catch {
          if (!entry.pc.remoteDescription) entry.pendingIce.push(candidate);
        }
        return;
      }

      if (type === "bye") {
        closePeer(from);
      }
    },
    [closePeer, createPeerConnection, rtc.forceRelay],
  );

  const pollOnce = useCallback(async () => {
    if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
    const poll = await operationsRef.current.poll({
      room: roomCodeRef.current,
      peerId: selfIdRef.current,
      sessionKey: joinedSessionKeyRef.current ?? undefined,
    });

    const roster = poll.peers ?? [];
    const incoming = (poll.messages ?? []) as Array<{
      from: string;
      type: SignalType;
      payload: unknown;
    }>;
    const selfPeerId = selfIdRef.current;
    const pendingKnockers = roster
      .map((peer) => {
        const name = decodeKnockerName(peer.name);
        if (!name) return null;
        return { id: peer.id, name } satisfies Knocker;
      })
      .filter((peer): peer is Knocker => peer !== null);
    setKnockers(pendingKnockers);
    const pendingKnockerIds = new Set(pendingKnockers.map((peer) => peer.id));
    const activeRoster = new Map<string, string>();
    for (const peer of roster) {
      if (pendingKnockerIds.has(peer.id)) continue;
      activeRoster.set(peer.id, peer.name);
    }
    const previousRoster = rosterRef.current;
    if (statusRef.current === "in-call") {
      activeRoster.forEach((name, id) => {
        if (!previousRoster.has(id)) toast.success(`${name} joined the call`);
      });
      previousRoster.forEach((name, id) => {
        if (!activeRoster.has(id)) toast(`${name} left the call`);
      });
    }
    rosterRef.current = activeRoster;

    for (const msg of incoming) {
      if (msg.type !== "chat") continue;
      const text = (msg.payload as { text?: unknown } | null)?.text;
      if (typeof text !== "string" || text.trim() === "") continue;
      const control = parseControlMessage(text.trim());
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
            await leaveRef.current?.();
          }
          continue;
        }
        if (control.peerId !== selfPeerId) continue;
        if (control.kind === "admit") {
          if (
            waitingForAdmissionRef.current &&
            operationsRef.current &&
            roomCodeRef.current &&
            selfIdRef.current
          ) {
            const joined = await operationsRef.current.join({
              room: roomCodeRef.current,
              peerId: selfIdRef.current,
              name: displayNameRef.current.trim() || "Guest",
            });
            joinedSessionKeyRef.current =
              typeof joined.sessionKey === "string" ? joined.sessionKey : null;
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

    const signals = sortSignalMessages(incoming.filter((msg) => msg.type !== "chat"));
    for (const signal of signals) {
      if (waitingForAdmissionRef.current) continue;
      if (pendingKnockerIds.has(signal.from)) continue;
      const fromName = roster.find((peer) => peer.id === signal.from)?.name ?? "Peer";
      await handleSignal(signal, fromName);
    }

    const known = peersRef.current;
    for (const peer of roster) {
      if (known.has(peer.id) || !selfPeerId) continue;
      if (waitingForAdmissionRef.current || pendingKnockerIds.has(peer.id)) continue;
      if (selfPeerId > peer.id) {
        const entry = createPeerConnection(peer.id, peer.name, rtc.forceRelay ? "relay" : "direct");
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        if (!entry.pc.localDescription?.sdp) continue;
        await operationsRef.current.send({
          room: roomCodeRef.current!,
          from: selfPeerId,
          to: peer.id,
          type: "offer",
          payload: { sdp: entry.pc.localDescription.sdp, type: entry.pc.localDescription.type },
          sessionKey: joinedSessionKeyRef.current ?? undefined,
        });
      }
    }

    const rosterIds = new Set(roster.map((peer) => peer.id));
    known.forEach((_entry, id) => {
      if (!rosterIds.has(id)) closePeer(id);
    });
  }, [closePeer, createPeerConnection, handleSignal, rtc.forceRelay]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const tick = async () => {
      const isActive = statusRef.current === "in-call" || statusRef.current === "waiting";
      if (!isActive) return;
      try {
        await pollOnce();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not poll room updates.";
        setError(message);
      } finally {
        if (statusRef.current === "in-call" || statusRef.current === "waiting") {
          pollTimerRef.current = window.setTimeout(tick, 1200);
        }
      }
    };
    pollTimerRef.current = window.setTimeout(tick, 250);
  }, [pollOnce, stopPolling]);

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

      try {
        await ensureLocalMedia();
        if (operationsRef.current) {
          const joined = await operationsRef.current.join({
            room: target,
            peerId,
            name: displayNameRef.current.trim() || "Guest",
          });
          joinedSessionKeyRef.current =
            typeof joined.sessionKey === "string" ? joined.sessionKey : null;
        }
        setStatus("in-call");
        setStartedAt(Date.now());
        startPolling();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not join meeting.";
        setStatus("failed");
        setError(message);
        throw e;
      }
    },
    [ensureLocalMedia, startPolling],
  );

  const leave = useCallback(async () => {
    stopPolling();
    const currentRoom = roomCodeRef.current;
    const currentPeerId = selfIdRef.current;
    if (operationsRef.current && currentRoom && currentPeerId) {
      const peerIds = [...peersRef.current.keys()];
      for (const peerId of peerIds) {
        try {
          await operationsRef.current.send({
            room: currentRoom,
            from: currentPeerId,
            to: peerId,
            type: "bye",
            payload: null,
            sessionKey: joinedSessionKeyRef.current ?? undefined,
          });
        } catch {
          // Ignore best-effort bye signal failures while leaving.
        }
      }
      try {
        await operationsRef.current.leave({
          room: currentRoom,
          peerId: currentPeerId,
          sessionKey: joinedSessionKeyRef.current ?? undefined,
        });
      } catch {
        // Ignore leave API failures on cleanup.
      }
    }

    [...peersRef.current.keys()].forEach((id) => closePeer(id));
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setScreenPreviewStream(null);
    cameraTrackRef.current = null;
    joinedSessionKeyRef.current = null;
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
    rosterRef.current = new Map();
    roomCodeRef.current = null;
    selfIdRef.current = null;
  }, [closePeer, stopPolling]);
  leaveRef.current = leave;

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

      try {
        await ensureLocalMedia();
        if (operationsRef.current) {
          const joined = await operationsRef.current.join({
            room: target,
            peerId,
            name: encodeKnockerName(displayNameRef.current),
          });
          joinedSessionKeyRef.current =
            typeof joined.sessionKey === "string" ? joined.sessionKey : null;
          await operationsRef.current.chat({
            room: target,
            from: peerId,
            text: buildControlMessage({
              kind: "knock",
              peerId,
              name: displayNameRef.current.trim() || "Guest",
            }),
            sessionKey: joinedSessionKeyRef.current ?? undefined,
          });
        }
        setStatus("waiting");
        startPolling();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not request to join.";
        setStatus("failed");
        setError(message);
        setWaitingForAdmission(false);
        throw e;
      }
    },
    [ensureLocalMedia, startPolling],
  );

  const admitKnocker = useCallback(
    async (peerId: string) => {
      if (!canModerateKnocks) return;
      if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
      await operationsRef.current.chat({
        room: roomCodeRef.current,
        from: selfIdRef.current,
        text: buildControlMessage({ kind: "admit", peerId }),
        sessionKey: joinedSessionKeyRef.current ?? undefined,
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
        text: buildControlMessage({ kind: "deny", peerId }),
        sessionKey: joinedSessionKeyRef.current ?? undefined,
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
        text: buildControlMessage({
          kind: "end",
          by: displayNameRef.current.trim() || "Host",
        }),
        sessionKey: joinedSessionKeyRef.current ?? undefined,
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
        sessionKey: joinedSessionKeyRef.current ?? undefined,
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
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenPreviewStream(null);
      const cameraTrack = cameraTrackRef.current;
      if (cameraTrack) await replaceVideoTrackOnAllPeers(cameraTrack);
      setScreenOn(false);
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
        })();
      };
      setScreenOn(true);
    } catch {
      // User canceled picker.
    }
  }, [replaceVideoTrackOnAllPeers, screenOn]);

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
