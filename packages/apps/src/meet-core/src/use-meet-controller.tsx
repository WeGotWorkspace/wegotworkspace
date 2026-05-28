import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { isRtcDebugEnabled } from "@/lib/rtc/debug";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { sanitizeRtcSdp } from "@/meet-core/src/meet-rtc-sdp";
import { readInboundMediaTotals } from "@/meet-core/src/meet-inbound-media-stats";
import type { MeetAPIOperations, MeetRtcSettings } from "@/meet-core/src/meet-types";

type SignalType = "offer" | "answer" | "ice" | "bye" | "chat";
type IceMode = "direct" | "relay";
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

type PeerInboundSample = {
  t: number;
  videoBytes: number;
  audioBytes: number;
  videoFramesDecoded: number;
  audioEnergy: number | null;
  videoStallTicks: number;
  audioStallTicks: number;
  pollCount: number;
};

type ControlMessage =
  | { kind: "knock"; peerId: string; name: string }
  | { kind: "admit"; peerId: string }
  | { kind: "deny"; peerId: string }
  | { kind: "end"; by: string }
  | { kind: "media"; mic: boolean; camera: boolean; screen?: boolean };

const KNOCK_NAME_PREFIX = "__wgw_knock__:";
const CONTROL_PREFIX = "__wgw_meet_control__:";

const SIGNAL_ORDER: Record<SignalType, number> = {
  offer: 0,
  answer: 1,
  ice: 2,
  bye: 3,
  chat: 4,
};

function parseCandidateType(candidate: string): string {
  const match = candidate.match(/\btyp\s+([a-z0-9]+)/i);
  return match?.[1]?.toLowerCase() ?? "unknown";
}

function parseCandidateProtocol(candidate: string): string {
  const parts = candidate.trim().split(/\s+/);
  return parts[2]?.toLowerCase() ?? "unknown";
}

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

function normalizeIceUrl(raw: string, defaultScheme: "stun" | "turn"): string {
  const value = raw.trim();
  if (value === "") return "";
  if (/^(stun|stuns|turn|turns):/i.test(value)) return value;
  return `${defaultScheme}:${value}`;
}

function parseUrlList(raw: string, defaultScheme: "stun" | "turn"): string[] {
  return raw
    .split(/[\n,\r]+/)
    .map((v) => normalizeIceUrl(v, defaultScheme))
    .filter((v) => v !== "");
}

function toRtcConfig(settings: MeetRtcSettings, mode: IceMode): RTCConfiguration {
  const turnUrls = parseUrlList(settings.turnUrls, "turn");
  const forceRelay = (settings.forceRelay || mode === "relay") && turnUrls.length > 0;
  const stunUrls = parseUrlList(settings.stunUrls, "stun");

  const iceServers: RTCIceServer[] = [];
  if (forceRelay) {
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username: settings.turnUsername || undefined,
        credential: settings.turnPassword || undefined,
      });
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
    if (
      parsed.kind === "media" &&
      typeof parsed.mic === "boolean" &&
      typeof parsed.camera === "boolean"
    ) {
      return {
        kind: "media",
        mic: parsed.mic,
        camera: parsed.camera,
        ...(typeof parsed.screen === "boolean" ? { screen: parsed.screen } : {}),
      };
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
  return { type: normalizedType, sdp: sanitizeRtcSdp(raw.sdp) };
}

function localDescriptionPayload(description: RTCSessionDescription): {
  sdp: string;
  type: RTCSdpType;
} {
  return {
    type: description.type,
    sdp: sanitizeRtcSdp(description.sdp ?? ""),
  };
}

async function applyLocalDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit,
): Promise<void> {
  if (description.type === "rollback") {
    await pc.setLocalDescription(description);
    return;
  }
  const normalized = toSessionDescription(description, description.type as RTCSdpType);
  if (!normalized) {
    await pc.setLocalDescription(description);
    return;
  }
  await pc.setLocalDescription(normalized);
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
  const rtcDebugEnabledRef = useRef(isRtcDebugEnabled());
  const debugRtc = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    if (!rtcDebugEnabledRef.current) return;
    console.info(`[meet][rtc][${new Date().toISOString()}] ${event}`, payload);
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
  const [knockers, setKnockers] = useState<Knocker[]>([]);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const participantRosterDiffReadyRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);
  const joinedSessionKeyRef = useRef<string | null>(null);
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
  const wasKnockerPeerIdsRef = useRef<Set<string>>(new Set());
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
    peersRef.current.forEach((entry, id) => {
      const connected = entry.pc.connectionState === "connected";
      next.push({
        id,
        name: entry.name,
        stream: entry.stream,
        connectionState: entry.pc.connectionState,
        remoteMedia: connected ? (peerMediaHintRef.current.get(id) ?? null) : null,
        disclosedMedia: peerDisclosedMediaRef.current.get(id) ?? null,
      });
    });
    setPeers(next);
  }, []);

  const announceMediaPresence = useCallback(
    async (mic: boolean, camera: boolean, screen?: boolean) => {
      if (!operationsRef.current || !roomCodeRef.current || !selfIdRef.current) return;
      if (statusRef.current !== "in-call") return;
      const screenOnNow = screen ?? screenOnRef.current;
      try {
        await operationsRef.current.chat({
          room: roomCodeRef.current,
          from: selfIdRef.current,
          text: buildControlMessage({
            kind: "media",
            mic,
            camera,
            screen: screenOnNow,
          }),
          sessionKey: joinedSessionKeyRef.current ?? undefined,
        });
      } catch {
        // Best-effort; peers may still infer from tracks or RTP stats.
      }
    },
    [],
  );

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
    (peerId: string, opts?: { announceLeave?: boolean }) => {
      const entry = peersRef.current.get(peerId);
      if (!entry) return;
      const name = entry.name;
      const announce = opts?.announceLeave !== false;
      entry.pc.close();
      entry.stream.getTracks().forEach((track) => track.stop());
      peersRef.current.delete(peerId);
      peerInboundSampleRef.current.delete(peerId);
      peerMediaHintRef.current.delete(peerId);
      peerDisclosedMediaRef.current.delete(peerId);
      refreshPeers();
      if (
        announce &&
        statusRef.current === "in-call" &&
        peerId !== selfIdRef.current &&
        selfIdRef.current
      ) {
        toast.info(meetLabels.participantLeft(name));
      }
    },
    [refreshPeers],
  );

  const createPeerConnection = useCallback(
    (peerId: string, peerName: string, mode: IceMode = "direct"): PeerEntry => {
      const config = toRtcConfig(rtc, mode);
      const pc = new RTCPeerConnection(config);
      const remoteStream = new MediaStream();
      debugRtc("pc-create", {
        peerId,
        peerName,
        mode,
        iceTransportPolicy: config.iceTransportPolicy ?? "all",
        iceServerCount: config.iceServers?.length ?? 0,
      });

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
        const track = event.track;
        if (track && !remoteStream.getTracks().includes(track)) {
          remoteStream.addTrack(track);
        }
        event.streams[0]?.getTracks().forEach((t) => {
          if (!remoteStream.getTracks().includes(t)) {
            remoteStream.addTrack(t);
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
        debugRtc("ice-candidate-local", {
          peerId,
          mode: entry.mode,
          candidateType: parseCandidateType(candidate.candidate),
          protocol: parseCandidateProtocol(candidate.candidate),
        });
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
        debugRtc("pc-connection-state", {
          peerId,
          peerName,
          mode: entry.mode,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          signalingState: pc.signalingState,
        });
        if (pc.connectionState === "connected") {
          peerInboundSampleRef.current.delete(peerId);
          peerMediaHintRef.current.delete(peerId);
          void announceMediaPresence(micOnRef.current, videoOnRef.current);
        }
        refreshPeers();
        if (pc.connectionState !== "failed") return;
        const turnConfigured = parseUrlList(rtc.turnUrls, "turn").length > 0;
        if (entry.mode === "relay" || entry.relayFallbackTried || !turnConfigured) {
          setError(`Connection to ${peerName} failed.`);
          return;
        }
        entry.relayFallbackTried = true;
        entry.mode = "relay";
        try {
          debugRtc("pc-relay-fallback-start", {
            peerId,
            peerName,
          });
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
            debugRtc("pc-relay-fallback-offer-sent", {
              peerId,
              peerName,
            });
          })();
        } catch {
          debugRtc("pc-relay-fallback-failed", {
            peerId,
            peerName,
          });
          setError(`Connection to ${peerName} failed.`);
        }
      };

      return entry;
    },
    [announceMediaPresence, refreshPeers, rtc],
  );

  useEffect(() => {
    if (status !== "in-call") {
      peerInboundSampleRef.current.clear();
      peerMediaHintRef.current.clear();
      peerDisclosedMediaRef.current.clear();
      refreshPeers();
      return;
    }

    void announceMediaPresence(micOnRef.current, videoOnRef.current);
    let cancelled = false;

    const sampleTick = async () => {
      if (cancelled) return;
      const entries = [...peersRef.current.entries()];
      await Promise.all(
        entries.map(async ([id, entry]) => {
          if (entry.pc.connectionState !== "connected") {
            peerInboundSampleRef.current.delete(id);
            peerMediaHintRef.current.delete(id);
            return;
          }
          try {
            const totals = await readInboundMediaTotals(entry.pc);
            const now = Date.now();
            const prev = peerInboundSampleRef.current.get(id);
            if (!prev) {
              peerInboundSampleRef.current.set(id, {
                t: now,
                videoBytes: totals.videoBytes,
                audioBytes: totals.audioBytes,
                videoFramesDecoded: totals.videoFramesDecoded,
                audioEnergy: totals.audioEnergy,
                videoStallTicks: 0,
                audioStallTicks: 0,
                pollCount: 1,
              });
              peerMediaHintRef.current.delete(id);
              return;
            }

            const dt = now - prev.t;
            if (dt < 400) return;

            const dvb = totals.videoBytes - prev.videoBytes;
            const dab = totals.audioBytes - prev.audioBytes;
            const dvf = totals.videoFramesDecoded - prev.videoFramesDecoded;
            const dEnergy =
              totals.audioEnergy != null && prev.audioEnergy != null
                ? totals.audioEnergy - prev.audioEnergy
                : null;

            let videoStallTicks = prev.videoStallTicks;
            let audioStallTicks = prev.audioStallTicks;

            if (prev.pollCount >= 2) {
              const videoFrozen = dvf === 0 && dvb < 260;
              videoStallTicks = videoFrozen ? prev.videoStallTicks + 1 : 0;

              let audioQuiet = dab < 52;
              if (dEnergy != null) {
                audioQuiet = audioQuiet && dEnergy < 1e-7;
              }
              audioStallTicks = audioQuiet ? prev.audioStallTicks + 1 : 0;
            }

            const nextSample: PeerInboundSample = {
              t: now,
              videoBytes: totals.videoBytes,
              audioBytes: totals.audioBytes,
              videoFramesDecoded: totals.videoFramesDecoded,
              audioEnergy: totals.audioEnergy,
              videoStallTicks,
              audioStallTicks,
              pollCount: prev.pollCount + 1,
            };
            peerInboundSampleRef.current.set(id, nextSample);

            if (nextSample.pollCount >= 3) {
              peerMediaHintRef.current.set(id, {
                camera: videoStallTicks < 3,
                mic: audioStallTicks < 5,
              });
            } else {
              peerMediaHintRef.current.delete(id);
            }
          } catch {
            // Ignore stats read failures.
          }
        }),
      );
      refreshPeers();
    };

    const intervalId = window.setInterval(() => {
      void sampleTick();
    }, 650);
    void sampleTick();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [announceMediaPresence, status, refreshPeers]);

  const handleSignal = useCallback(
    async (message: { from: string; type: SignalType; payload: unknown }, peerName: string) => {
      if (message.type === "chat") return;
      const { from, type, payload } = message;
      debugRtc("signal-received", { from, type, peerName });
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
          debugRtc("ice-candidate-remote-added", {
            from,
            candidateType: parseCandidateType(candidate.candidate),
            protocol: parseCandidateProtocol(candidate.candidate),
          });
        } catch {
          if (!entry.pc.remoteDescription) entry.pendingIce.push(candidate);
          debugRtc("ice-candidate-remote-add-failed", {
            from,
            hasRemoteDescription: !!entry.pc.remoteDescription,
          });
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
    if (statusRef.current === "in-call") {
      if (!participantRosterDiffReadyRef.current) {
        participantRosterDiffReadyRef.current = true;
        rosterRef.current = activeRoster;
      } else {
        const prev = rosterRef.current;
        activeRoster.forEach((name, id) => {
          if (id === selfPeerId) return;
          if (!prev.has(id)) toast.success(meetLabels.participantJoined(name));
        });
        rosterRef.current = activeRoster;
      }
    } else {
      rosterRef.current = activeRoster;
    }

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
            refreshPeers();
          }
          continue;
        }
        if (control.kind !== "admit" && control.kind !== "deny") continue;
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
  }, [closePeer, createPeerConnection, handleSignal, refreshPeers, rtc.forceRelay]);

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
        debugRtc("poll-failed", { message });
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
      participantRosterDiffReadyRef.current = false;

      try {
        debugRtc("join-room-start", { room: target, peerId });
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
        debugRtc("join-room-success", { room: target, peerId });
        startPolling();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not join meeting.";
        debugRtc("join-room-failed", { room: target, peerId, message });
        setStatus("failed");
        setError(message);
        throw e;
      }
    },
    [ensureLocalMedia, startPolling],
  );

  const leave = useCallback(
    async (opts?: { preserveEndedMessage?: boolean }) => {
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

      [...peersRef.current.keys()].forEach((id) => closePeer(id, { announceLeave: false }));
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
      if (!opts?.preserveEndedMessage) {
        setEndedMessage(null);
      }
      rosterRef.current = new Map();
      participantRosterDiffReadyRef.current = false;
      roomCodeRef.current = null;
      selfIdRef.current = null;
      peerDisclosedMediaRef.current.clear();
    },
    [closePeer, stopPolling],
  );
  leaveRef.current = leave;

  const sendLeaveBeacon = useCallback(() => {
    const room = roomCodeRef.current;
    const peerId = selfIdRef.current;
    if (!room || !peerId) return;
    const payload = JSON.stringify({
      room,
      peerId,
      sessionKey: joinedSessionKeyRef.current ?? undefined,
    });
    const endpoint = "/api/v1/voice/leave";
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
  }, []);

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
      participantRosterDiffReadyRef.current = false;

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
